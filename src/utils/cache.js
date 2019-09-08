import { createLogger } from '@unly/utils-simple-logger';
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
 * Add an item to the cache
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
