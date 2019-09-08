import { buildItem } from './cache';
import { extractDataFromRedisKey, generateRedisKey, getClient } from './redis';

let redisClient;
let redisClientFailure;

describe('utils/redis.js', () => {
  beforeAll(() => {
    redisClient = getClient();
    redisClientFailure = getClient('localhost:5555', null, 0); // XXX This shouldn't throw an error because we're using lazyConnect:true which doesn't automatically connect to redis
  });

  afterAll(async () => {
    await redisClient.quit();
    await redisClientFailure.quit();
  });

  describe('should successfully init the redis client', () => {
    test('when provided connection info are correct', async () => {
      // Environment variables are from the .env.test file - This tests a localhost connection only
      expect(redisClient.options.host).toEqual(process.env.REDIS_URL.split(':')[0]);
      expect(redisClient.options.port).toEqual(parseInt(process.env.REDIS_URL.split(':')[1], 10));
      expect(redisClient.options.password).toEqual(process.env.REDIS_PASSWORD);
    });

    test('when connection info are incorrect', async () => {
      expect(redisClientFailure.options.host).toEqual('localhost');
      expect(redisClientFailure.options.port).toEqual(5555);
    });
  });

  describe('should successfully perform native operations (read/write/delete/update)', () => {
    test('when using async/await (using native node.js promises)', async () => {
      const redisKey = generateRedisKey('key-1', {});
      const item = buildItem('value-1');
      const setResult = await redisClient.set(redisKey, JSON.stringify(item));
      expect(setResult).toEqual('OK');

      const result = await redisClient.get(redisKey);
      expect(JSON.parse(result)).toMatchObject(item);

      const delResult = await redisClient.del(redisKey);
      expect(delResult).toEqual(1);

      const itemB = buildItem('value-1b');
      const setResultB = await redisClient.set(redisKey, JSON.stringify(itemB));
      expect(setResultB).toEqual('OK');

      const resultB = await redisClient.get(redisKey);
      expect(JSON.parse(resultB)).toMatchObject(itemB);

      const itemC = buildItem('value-1c');
      const setResultC = await redisClient.set(redisKey, JSON.stringify(itemC));
      expect(setResultC).toEqual('OK');

      const resultC = await redisClient.get(redisKey);
      expect(JSON.parse(resultC)).toMatchObject(itemC);
    });
  });

  describe('should allow to catch an error when failing to open a connection to redis, in order to gracefully handle the error instead of crashing the app', () => {
    test('when connection info are incorrect', async () => {
      expect(redisClientFailure.options.host).toEqual('localhost');
      expect(redisClientFailure.options.port).toEqual(5555);

      try {
        await redisClientFailure.set('key-1', 'value-1'); // This should throw an error, because the connection to redis will be made when executing the
        expect(true).toBe(false); // This shouldn't be called, or the test will fail
      } catch (e) {
        expect(e).toBeDefined();
        expect(e.message).toContain('Reached the max retries per request limit');
      }
      await redisClientFailure.quit();
    });
  });

  describe('generateRedisKey and extractDataFromRedisKey', () => {
    test('should generate and extract a redis key', async () => {
      const body = 'some body';
      const headers = { locale: 'FR' };
      const expectedRedisKey = JSON.stringify({ body, headers });
      expect(generateRedisKey(body, headers)).toEqual(expectedRedisKey);

      expect(extractDataFromRedisKey(expectedRedisKey)).toEqual({ body, headers });
    });
  });
});
