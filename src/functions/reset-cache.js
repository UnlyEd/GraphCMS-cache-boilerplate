import { createLogger } from '@unly/utils-simple-logger';

import { headerAuthentication, noTokenProvidedMessage } from '../utils/auth';
import { handleGraphCMSCompatibleErrorResponse } from '../utils/graphql';
import { getClient } from '../utils/redis';

const logger = createLogger({
  label: 'Reset cache',
});

/**
 *
 *
 * @type {Function}
 * @param event
 * @param context
 * @return {Promise<{body: *, statusCode: number}>}
 */
export const resetCache = async (event, context) => {
  logger.debug('Lambda "resetCache" called.');
  const redisClient = getClient();

  if (!headerAuthentication(event.headers)) {
    logger.debug('Caller is not authorized to connect, an error will now be sent to the client.', 'FATAL');

    return {
      statusCode: 401,
      body: handleGraphCMSCompatibleErrorResponse(noTokenProvidedMessage),
    };
  }

  const flushResult = await redisClient.flushdb();
  const status = flushResult === 'OK';

  logger.debug('Results are now sent to the client.');
  return {
    statusCode: 200,
    body: JSON.stringify({
      status,
      message: status ? `The cache was reset successfully` : `An error happened during cache reset, see logs for more details`,
    }),
  };
};
