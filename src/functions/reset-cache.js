import { createLogger } from '@unly/utils-simple-logger';

import { headerAuthentication, noTokenProvidedMessage } from '../utils/auth';
import epsagon from '../utils/epsagon';
import { handleGraphCMSCompatibleErrorResponse } from '../utils/graphql';
import { getClient } from '../utils/redis';
import { wait } from '../utils/timers';

const logger = createLogger({
  label: 'Reset cache',
});

const redisClient = getClient(); // XXX Init redis connection from outside the lambda handler in order to share the connection - See https://www.jeremydaly.com/reuse-database-connections-aws-lambda/

/**
 * Reset the cache (redis)
 * Completely wipes the whole cache (flush)
 *
 * @type {Function}
 * @param event
 * @param context
 * @return {Promise<{body: *, statusCode: number}>}
 */
export const resetCache = async (event, context) => {
  logger.debug('Lambda "resetCache" called.');

  if (!headerAuthentication(event.headers)) {
    logger.debug('Caller is not authorized to connect, an error will now be sent to the client.', 'FATAL');

    return {
      statusCode: 401,
      body: handleGraphCMSCompatibleErrorResponse(noTokenProvidedMessage),
    };
  }

  let flushResult;
  try {
    flushResult = await redisClient.flushdb();
  } catch (e) {
    logger.debug(`An exception occurred while flushing redis cache.`, 'FATAL');
    logger.error(e);
    epsagon.setError(e);
  }
  const status = flushResult === 'OK';

  const sleep = 10000;
  logger.debug(`Pausing script for ${sleep}ms - Forces no more than one cache reset once in a little while`);
  await wait(sleep);

  logger.debug('Results are now sent to the client.');
  return {
    statusCode: 200,
    body: JSON.stringify({
      status,
      message: status ? `The cache was reset successfully` : `An error happened during cache reset, see logs for more details`,
    }),
  };
};
