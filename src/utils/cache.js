import { createLogger } from '@unly/utils-simple-logger';
import deepmerge from 'deepmerge';

import { generateRedisKey } from './redis';

const logger = createLogger({
  label: 'Cache utils',
});

/**
 * Build an item meant to be added to the cache
 *
 * @param queryResults
 * @return {{createdAt: *, queryResults: *, version: number, updatedAt: null}}
 */
export const buildItem = (queryResults) => {
  return {
    createdAt: Date.now(),
    updatedAt: null,
    version: 0,
    queryResults,
  };
};

/**
 * Adds an item to the cache
 * An item is composed of metadata and query results
 * Automatically add metadata
 *
 * @param redisClient
 * @param query
 * @param headers
 * @param queryResults
 * @return {Promise<void>}
 */
export const addItemToCache = async (redisClient, query, headers, queryResults) => {
  const redisKey = generateRedisKey(query, headers);

  return await redisClient.set(redisKey, JSON.stringify(buildItem(queryResults)));
};

/**
 * Updates an item that already exists in the cache
 * Automatically handles "version" (auto-increment) and "updatedAt" metadata
 *
 * @param redisClient
 * @param query
 * @param headers
 * @param queryResults
 * @return {Promise<*>}
 */
export const updateItemInCache = async (redisClient, query, headers, queryResults) => {
  const redisKey = generateRedisKey(query, headers);
  const oldValue = await redisClient.get(redisKey);
  const metadata = extractMetadataFromItem(oldValue);
  metadata.version += 1;
  metadata.updatedAt = Date.now(); // Override

  return await redisClient.set(redisKey, JSON.stringify({
    ...metadata,
    queryResults,
  }));
};

/**
 * Returns a usable version of an item information
 * Basically parses it if it's a string (the way it's stored in redis)
 * Or do nothing if it's already parsed
 *
 * @param item
 * @return {any}
 */
export const extractCachedItem = (item) => {
  if (typeof item === 'string') {
    try {
      return JSON.parse(item);
    } catch (e) {
      logger.error(`Failed to parse item "${item}".`);

      // XXX Item can't be parsed, so it's likely a string that was meant to be the query results
      //  Returns the item as query results and cross fingers, this shouldn't happen,
      //  but may happen if dealing with an item that was stored before the items became an object
      return {
        queryResults: item,
      };
    }
  } else {
    return item;
  }
};

/**
 * Returns the query results object
 *
 * @param item
 * @return {any.queryResults}
 */
export const extractQueryResultsFromItem = (item) => {
  if (item === null) {
    return null;
  }
  if (typeof item === 'undefined') {
    throw Error('"undefined" item was provided, this is likely due to providing a bad key to redis.get()');
  }
  const { queryResults } = extractCachedItem(item);

  return queryResults;
};

/**
 * Returns only the metadata contained in an item, doesn't return the actual data
 *
 * @param item
 * @return {{createdAt: *, version: *, updatedAt: *}|null}
 */
export const extractMetadataFromItem = (item) => {
  if (item === null) {
    return null;
  }
  const { createdAt, updatedAt, version } = extractCachedItem(item);

  return {
    createdAt,
    updatedAt,
    version,
  };
};

/**
 * Helper for debugging the item resolved from the Redis cache
 * Print the whole item by default, but can override keys to avoid leaking data in the logs, or just print metadata to avoid the noise
 * XXX Beware printing sensitive information in production environment
 *
 * @example Will print metadata and the whole item
 *  printCachedItem(cachedItem, false);
 * @example Will only print metadata
 *  printCachedItem(cachedItem, true);
 * @example Will print metadata and will "strip" both subQueryKey1 and subQueryKey2
 *  printCachedItem(cachedItem, { subQueryKey1: undefined, subQueryKey2: undefined });
 *
 * @param cachedItem Item to print
 * @param stripData Either boolean (show/hide data) or an object that may hide only particular data keys (sub queries results)
 */
export const printCachedItem = (cachedItem, stripData = false) => {
  // If object, use object as stripper, otherwise convert to boolean
  const stripper = typeof stripData === 'object' ? { queryResults: { data: stripData } } : !!stripData ? { queryResults: { data: undefined } } : {};
  logger.debug(JSON.stringify(deepmerge(extractCachedItem(cachedItem), stripper), null, 2));
};
