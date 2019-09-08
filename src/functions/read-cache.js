import { createLogger } from '@unly/utils-simple-logger';
import map from 'lodash.map';

import { extractMetadataFromItem } from '../utils/cache';
import epsagon from '../utils/epsagon';
import { handleGraphCMSCompatibleErrorResponse, makeQueryHumanFriendly } from '../utils/graphql';
import { extractDataFromRedisKey, getClient } from '../utils/redis';

const logger = createLogger({
  label: 'Read cache',
});

export const readCache = async (event, context) => {
  logger.debug('Lambda "readCache" called.');
  const redisClient = getClient();
  const queriesData = [];
  let redisKeys;

  try {
    logger.debug('Fetching all GraphCMS queries (stored as keys in redis).');
    // XXX If fetching data from redis fails, we can't do anything about it since we're supposed to read them from the cache.
    //  We could execute the queries again but there would be no interest in doing so
    //  since this endpoint is mostly for debug purpose and meant to test if the redis cache works properly
    redisKeys = await redisClient.keys('*'); // TODO I/O blocking, not an immediate concern but could/should be improved - See https://github.com/luin/ioredis#streamify-scanning
    logger.debug('Redis keys (queries) were fetched successfully.');
  } catch (e) {
    logger.debug('An error occurred when fetching the redis keys, an error will now be sent to the client.', 'FATAL');
    logger.error(e);
    epsagon.setError(e);

    return {
      statusCode: 500,
      body: handleGraphCMSCompatibleErrorResponse(`Internal server error. See server logs for debug.`),
    };
  }

  // The cache is indexed by query, stored as strings - Each key contain a GraphCMS query
  logger.debug('Fetching the previously cached data (from GraphCMS API) of each GraphCMS query from redis...');
  const values = await Promise.all(
    map(redisKeys, async (redisKey) => {
      try {
        return redisClient.get(redisKey);
      } catch (e) {
        logger.error(e);
        epsagon.setError(e);
        return null;
      }
    }),
  );
  logger.debug('Fetched all data from redis successfully.');

  map(values, (value, index) => {
    const redisKey = redisKeys[index];
    const { body, headers } = extractDataFromRedisKey(redisKey);

    queriesData.push({
      ...extractMetadataFromItem(value),
      body: JSON.parse(body),
      headers,
    });
  });

  logger.debug('Results are now sent to the client.');
  return {
    statusCode: 200,
    body: JSON.stringify(map(queriesData, (queryData) => {
      return {
        ...queryData,
        body: {
          ...queryData.body,
          query: makeQueryHumanFriendly(queryData.body.query),
        },
      };
    })),
  };
};
