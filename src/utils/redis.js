import { createLogger } from '@unly/utils-simple-logger';
import Redis from 'ioredis';
import epsagon from './epsagon';

const logger = createLogger({
  label: 'Redis client',
});

/**
 * Creates a redis client
 *
 * @param url Url of the redis client, must contain the port number and be of the form "localhost:6379"
 * @param password Password of the redis client
 * @param maxRetriesPerRequest By default, all pending commands will be flushed with an error every 20 retry attempts.
 *          That makes sure commands won't wait forever when the connection is down.
 *          Set to null to disable this behavior, and every command will wait forever until the connection is alive again.
 * @return {Redis}
 */
export const getClient = (url = process.env.REDIS_URL, password = process.env.REDIS_PASSWORD, maxRetriesPerRequest = 20) => {
  const client = new Redis(`redis://${url}`, {
    password,
    showFriendlyErrorStack: true, // See https://github.com/luin/ioredis#error-handling
    lazyConnect: true, // XXX Don't attempt to connect when initializing the client, in order to properly handle connection failure on a use-case basis
    maxRetriesPerRequest,
  });

  client.on('connect', () => {
    logger.info('Connected to redis instance');
  });

  client.on('ready', () => {
    logger.info('Redis instance is ready (data loaded from disk)');
  });

  // Handles redis connection temporarily going down without app crashing
  // If an error is handled here, then redis will attempt to retry the request based on maxRetriesPerRequest
  client.on('error', (e) => {
    logger.error(`Unexpected error from redis client: "${e}"`);
    logger.error(e);
    epsagon.setError(e);
  });

  return client;
};

/**
 * Generate a redis key (string) based on different data
 * Basically creates a string from a JSON object
 *
 * @param body
 * @param headers
 * @return {string}
 */
export const generateRedisKey = (body, headers) => {
  return JSON.stringify({
    body,
    headers,
  });
};

/**
 * Extract all data contained within a redis key
 * Basically parses the redis key, which is a JSON string
 *
 * @param redisKey
 * @return {any}
 */
export const extractDataFromRedisKey = (redisKey) => {
  try {
    return JSON.parse(redisKey);
  } catch (e) {
    logger.error(`Failed to parse redisKey "${redisKey}".`);

    // XXX Redis key can't be parsed, so it's likely a string that was meant to be the query body
    //  Returns the redis key as body and cross fingers, this shouldn't happen,
    //  but may happen if dealing with keys that were stored before the redis key became a JSON string
    return {
      body: redisKey,
    };
  }
};
