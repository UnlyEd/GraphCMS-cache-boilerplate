import { createLogger } from '@unly/utils-simple-logger';
import map from 'lodash.map';

import { headerAuthentication, noTokenProvidedMessage } from '../utils/auth';
import { updateItemInCache } from '../utils/cache';
import epsagon from '../utils/epsagon';
import { extractDataFromRedisKey, getClient } from '../utils/redis';
import { wait } from '../utils/timers';
import { handleGraphCMSCompatibleErrorResponse, makeQueryHumanFriendly, runQuery } from '../utils/graphql';


const logger = createLogger({
  label: 'Refresh cache',
});

export const gcmsWebhookTokenKey = 'GraphCMS-WebhookToken';

/**
 * Refresh the cache (redis)
 * Executes all queries that are stored in the redis store in order to refresh all cached values
 * The cache must only be refreshed if there was no error during the query
 * If an error happens during a query, the cache must not be updated, because the goal of this caching mechanism is to ensure stability/robustness, even at the price of data integrity
 *
 * @type {Function}
 * @param event
 * @param context
 * @return {Promise<{body: *, statusCode: number}>}
 */
export const refreshCache = async (event, context) => {
  logger.debug('Lambda "refreshCache" called.');
  const redisClient = getClient();

  if (!headerAuthentication(event.headers)) {
    logger.debug('Caller is not authorized to connect, an error will now be sent to the client.', 'FATAL');

    return {
      statusCode: 401,
      body: handleGraphCMSCompatibleErrorResponse(noTokenProvidedMessage),
    };
  }

  let redisKeys;
  try {
    logger.debug('Fetching all GraphCMS queries (stored as keys in redis).');
    // XXX If fetching data from redis fails, we can't do anything about it since it's a requirement in order to update the data
    redisKeys = await redisClient.keys('*'); // TODO I/O blocking, not an immediate concern but could/should be improved - See https://github.com/luin/ioredis#streamify-scanning
    logger.debug('Redis keys (queries) were fetched successfully.');
  } catch (e) {
    logger.debug(`An exception occurred while fetching redis cache.`, 'FATAL');
    logger.error(e);
    epsagon.setError(e);

    return {
      statusCode: 500,
      body: handleGraphCMSCompatibleErrorResponse(`Internal server error. See server logs for debug.`),
    };
  }

  const sleep = 10000;
  logger.debug(`Pausing script for ${sleep}ms before continuing (naive debounce-ish AKA cross-fingers)`);
  await wait(sleep);

  const { ApolloClientFactory } = require('../utils/apolloClient'); // eslint-disable-line global-require
  const queriesPromises = redisKeys.map(async (redisKey) => {
    const { body, headers } = extractDataFromRedisKey(redisKey);
    const client = ApolloClientFactory(headers);
    return runQuery(JSON.parse(body), client);
  });

  // Fetch all queries in parallel and await them to be all finished
  logger.debug('Running all GraphCMS queries against GraphCMS API...');
  const queriesResults = await Promise.all(queriesPromises).catch((error) => {
    logger.error(error);
    epsagon.setError(error);
  });
  const updatedResults = [];
  const failedResults = [];

  map(queriesResults, (queryResult, index) => {
    if (queryResult.errors) {
      // When a query returns an error, we don't update the cache
      epsagon.setError(Error(`Cache refresh failed with "${JSON.stringify(queryResult.errors)}"`));
      logger.error(JSON.stringify(queryResult.errors, null, 2), 'graphcms-query-error');
      failedResults.push(queryResult);
    } else {
      const redisKey = redisKeys[index];
      const { body, headers } = extractDataFromRedisKey(redisKey);
      logger.debug(`Updating redis cache at index ${index} for query "${makeQueryHumanFriendly(body)}" and headers "${JSON.stringify(headers)}".`);

      // Otherwise, update the existing entry with the new values
      // XXX Executed async, no need to wait for result to continue
      updateItemInCache(redisClient, body, headers, queryResult)
        .then((result) => {
          if (result !== 'OK') {
            throw new Error(result);
          } else {
            logger.debug(`Redis key at index ${index} with query "${makeQueryHumanFriendly(body)}" and headers "${JSON.stringify(headers)}" was successfully updated (new data size: ${JSON.stringify(queryResult).length}).`);
          }
        })
        .catch((error) => {
          epsagon.setError(error);
          logger.error(`Redis key at index ${index} with query "${makeQueryHumanFriendly(body)}" and headers "${JSON.stringify(headers)}" failed to update (key size: ${JSON.stringify(body).length}).`);
        });

      updatedResults.push(queryResult);
    }
  });

  logger.debug('Results are now sent to the client.');
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: true,
      message: `${updatedResults.length} entries updated, ${failedResults.length} entries failed`,
      updatedEntries: updatedResults.length,
      failedEntries: failedResults.length,
    }),
  };
};
