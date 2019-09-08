import { eventExample } from '../constants';
import {
  buildGraphCMSError, extractHeadersToForward, handleGraphCMSCompatibleErrorResponse, makeQueryHumanFriendly, runQuery,
} from './graphql';

describe('utils/graphql.js', () => {
  describe('runQuery', () => {
    test('should throw an error when the query is provided as a string instead of an object', async () => {
      const { ApolloClientFactory } = require('../utils/apolloClient'); // eslint-disable-line global-require
      const client = ApolloClientFactory({});
      await expect(runQuery('not-a-query', client)).rejects.toThrow(Error);
    });

    test('should throw an error when no apollo client is provided', async () => {
      await expect(runQuery('not-a-query')).rejects.toThrow(Error);
    });
  });

  describe('buildGraphCMSError', () => {
    test('should convert an error message to an error object that is ISO with GraphCMS API response', async () => {
      const error = buildGraphCMSError('some error message');
      expect(error.message).toContain('some error message');
    });

    test('should add a namespace to errors', async () => {
      const error = buildGraphCMSError('some error message');
      expect(error.message).toContain('[Cache]');
    });
  });

  describe('handleGraphCMSCompatibleErrorResponse', () => {
    test('should return a GraphCMS API compatible HTTP response body', async () => {
      const body = JSON.parse(handleGraphCMSCompatibleErrorResponse('some error message'));
      expect(body.data).toBeObject();
      expect(body.errors).toBeArray();
      expect(body.errors[0].message).toContain('some error message');
    });
  });

  describe('makeQueryHumanFriendly', () => {
    test('should strip unnecessary characters', async () => {
      const unfriendlyQuery = JSON.parse(eventExample.body).query;
      const friendlyQuery = makeQueryHumanFriendly(unfriendlyQuery, 9, '');
      expect(friendlyQuery).toEqual('{__schema');
    });
  });

  describe('extractHeadersToForward', () => {
    test('should remove non-whitelisted headers', async () => {
      const headers = {
        'accept': '*/*',
        'content-type': 'application/json',
        'locale': 'EN',
        'gcms-locale': 'EN, FR',
        'gcms-locale-no-default': 'false',
        'Content-Length': '146',
        'User-Agent': 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
        'Accept-Encoding': 'gzip,deflate',
        'Connection': 'close',
        'Host': 'localhost:8085',
      };
      const forwardedHeaders = extractHeadersToForward(headers);
      expect(forwardedHeaders).toEqual({
        'locale': 'EN',
        'gcms-locale': 'EN, FR',
        'gcms-locale-no-default': 'false',
      });
    });
  });
});
