import waitForExpect from 'wait-for-expect';

import { eventExample, responseSchemaData } from '../constants';
import { addItemToCache, extractMetadataFromItem, extractQueryResultsFromItem } from '../utils/cache';
import { generateRedisKey, getClient } from '../utils/redis';
import { cacheQuery } from './cache-query';

const GCMS_INVALID_TOKEN = 'The Token you passed is Invalid!';
let redisClient;

describe('functions/cache-query.js', () => {
  beforeAll(() => {
    redisClient = getClient();
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  describe('cacheQuery should return the cached data', () => {
    test('when the query is not cached yet (empty cache)', async () => {
      await redisClient.flushdb();

      const result = await cacheQuery(eventExample, null);
      expect(result).toBeObject();
      expect(JSON.parse(result.body)).toEqual(responseSchemaData);
    });

    test('when the query is cached manually using "addItemToCache"', async () => {
      // We use another client to connect to localhost instead of graphCMS
      const flushResult = await redisClient.flushdb();
      expect(flushResult).toEqual('OK'); // Check that redis flushed the DB correctly

      const response = await addItemToCache(redisClient, eventExample.body, eventExample.headers, 'test-value');
      expect(response).not.toBeNull();

      const redisKey = generateRedisKey(eventExample.body, eventExample.headers);
      const item = await redisClient.get(redisKey);
      const queryResults = extractQueryResultsFromItem(item);
      expect(queryResults).toEqual('test-value');

      const metadata = extractMetadataFromItem(item);
      expect(metadata.updatedAt).toBeNull();
      expect(metadata.version).toEqual(0);
    });

    test('when the query is cached automatically using "cacheQuery"', async () => {
      const flushResult = await redisClient.flushdb();
      expect(flushResult).toEqual('OK'); // Check that redis flushed the DB correctly

      // Check the response contains the expected data
      const result = await cacheQuery(eventExample, null);
      expect(result).toBeObject();
      const { statusCode, body } = result;
      const { data, error } = JSON.parse(body);
      expect(statusCode).toBe(200); // Should return good status
      expect(data).toBeObject(); // Should contain data
      expect(error).toBeUndefined(); // Shouldn't contain error

      setTimeout(() => {
        // Wait for the redis cache to be updated (asynchronous non-blocking)
      }, 1000);

      await waitForExpect(async () => { // See https://github.com/TheBrainFamily/wait-for-expect#readme
        // Check the cache contains the expected data as well (should have been updated by cacheQuery)
        const redisKey = generateRedisKey(eventExample.body, eventExample.headers);
        const item = await redisClient.get(redisKey);
        const queryResults = extractQueryResultsFromItem(item);
        expect(queryResults).toBeObject();

        const metadata = extractMetadataFromItem(item);
        expect(metadata.updatedAt).toBeNull();
        expect(metadata.version).toEqual(0);
      });
    });
  });

  describe('cacheQuery should return an error', () => {
    describe('when the cache is empty and', () => {
      beforeEach(async () => {
        const flushResult = await redisClient.flushdb();
        expect(flushResult).toEqual('OK'); // Check that redis flushed the DB correctly
      });

      test('when graphCMS is down', async () => {
        const { body } = await cacheQuery({
          ...eventExample,
          __TEST_GRAPHCMS_ENDPOINT: '',
        }, null);
        const result = JSON.parse(body);
        expect(result).toBeObject();
        expect(result).toMatchObject({
          data: {},
          errors: [{ message: '[Cache] Error: Network error: Only absolute URLs are supported' }],
        });
      });

      test('on using bad token for GraphCMS', async () => {
        const { body, statusCode } = await cacheQuery({
          ...eventExample,
          __TEST_GRAPHCMS_TOKEN: '',
        }, null);
        expect(statusCode).toEqual(200);
        const result = JSON.parse(body);
        expect(result).toBeObject();
        expect(result).toMatchObject({
          errors: [{ message: GCMS_INVALID_TOKEN }],
          loading: false,
          networkStatus: 7,
          stale: false,
        });
      });
    });

    test('when the request body does not contain a valid GraphQL query', async () => {
      const { body, statusCode } = await cacheQuery('not a valid query', null);
      expect(statusCode).toEqual(500);
      const result = JSON.parse(body);
      expect(result).toBeObject();
      expect(result.errors).toBeArray();
      expect(result.errors.length).toEqual(1);
    });
  });

  describe('cacheQuery should return data', () => {
    describe('when the cache is filled and', () => {
      beforeEach(async () => {
        await redisClient.flushdb();
        await addItemToCache(redisClient, eventExample.body, eventExample.headers, responseSchemaData);
      });

      test('even when GraphCMS is down (bad token, simulates a 401)', async () => {
        const { body } = await cacheQuery({
          ...eventExample,
          __TEST_GRAPHCMS_ENDPOINT: '',
        }, null);
        expect(JSON.parse(body)).toBeObject();
        expect(JSON.parse(body)).toEqual(responseSchemaData);
      });

      test('even when redis is down (bad url, simulates a 404)', async () => {
        const { body } = await cacheQuery({
          ...eventExample,
          __TEST_REDIS_URL: '',
        }, null);
        expect(JSON.parse(body)).toBeObject();
        expect(JSON.parse(body)).toEqual(responseSchemaData);
      });

      test('even when redis connection fails (bad password, simulates a 401)', async () => {
        const { body } = await cacheQuery({
          ...eventExample,
          __TEST_REDIS_PASSWORD: '',
        }, null);
        expect(JSON.parse(body)).toBeObject();
        expect(JSON.parse(body)).toEqual(responseSchemaData);
      });
    });
  });
});
