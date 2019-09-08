import waitForExpect from 'wait-for-expect';
import { eventExample } from '../constants';
import { addItemToCache } from '../utils/cache';
import { generateRedisKey, getClient } from '../utils/redis';
import { resetCache } from './reset-cache';

const fakeEvent = { headers: { 'GraphCMS-WebhookToken': process.env.REFRESH_CACHE_TOKEN } };
let redisClient;

describe('functions/reset-cache.js', () => {
  beforeEach(async () => {
    const flushResult = await redisClient.flushdb();
    expect(flushResult).toEqual('OK'); // Check that redis flushed the DB correctly
  });

  beforeAll(() => {
    redisClient = getClient();
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  describe('should check authentication before performing any action, and', () => {
    test('should return "Unauthorized" (401) when not providing a token', async () => {
      const { statusCode } = await resetCache({
        headers: {},
      });
      expect(statusCode).toBe(401);
    });

    test('should return "Unauthorized" (401) when providing a wrong token', async () => {
      const { statusCode } = await resetCache({
        headers: { Authorization: 'i-am-wrong' },
      });
      expect(statusCode).toBe(401);
    });

    test('should be authorized (200) when providing a proper token', async () => {
      const { statusCode } = await resetCache(fakeEvent);
      expect(statusCode).toBe(200);
    });
  });

  describe('when the redis cache is empty, it', () => {
    test('should reset the cache (which does not change anything because there were no entries anyway)', async () => {
      await resetCache(fakeEvent);
      const getResult = await redisClient.keys('*');
      expect(getResult.length).toEqual(0);
    });
  });

  describe('when the redis cache is filled with correct queries, it', () => {
    beforeEach(async () => {
      const setResult = await addItemToCache(redisClient, eventExample.body, eventExample.headers, 'test-value');
      expect(setResult).toEqual('OK'); // Check that redis set data correctly
    });

    test('should remove all items in the cache', async () => {
      const redisKey = generateRedisKey(eventExample.body, eventExample.headers);
      const results = JSON.parse(await redisClient.get(redisKey));
      expect(results).toBeDefined(); // Check the value exists in the cache before reset
      expect(results.queryResults).toEqual('test-value');
      expect(results.version).toEqual(0);

      const refreshResult = await resetCache(fakeEvent);
      expect(refreshResult.statusCode).toEqual(200);
      expect(JSON.parse(refreshResult.body).status).toEqual(true);

      setTimeout(() => {
        // Wait for the redis cache to be updated (asynchronous non-blocking)
      }, 1000);

      await waitForExpect(async () => { // See https://github.com/TheBrainFamily/wait-for-expect#readme
        const redisKeys = await redisClient.keys('*'); // Check that all the items have been removed from the cache
        expect(redisKeys).toBeArray();
        expect(redisKeys.length).toEqual(0);
      });
    });
  });
});
