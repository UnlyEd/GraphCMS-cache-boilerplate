import { headerAuthentication } from './auth';

const authenticatedEvent = { headers: { 'GraphCMS-WebhookToken': process.env.REFRESH_CACHE_TOKEN } };
const authenticatedEventLC = { headers: { 'graphcms-webhooktoken': process.env.REFRESH_CACHE_TOKEN } };
const unauthenticatedEvent = { headers: { 'GraphCMS-WebhookToken': 'i-am-wrong' } };
const unauthenticatedEventEmpty = { headers: {} };

describe('utils/auth.js', () => {
  describe('headerAuthentication', () => {
    test('should authenticate properly when providing a correct authentication header', () => {
      const result = headerAuthentication(authenticatedEvent.headers);
      expect(result).toEqual(true);
    });

    test('should authenticate properly when providing a correct authentication header, when the header has been lower cased', () => {
      const result = headerAuthentication(authenticatedEventLC.headers);
      expect(result).toEqual(true);
    });

    test('should not authenticate when providing an incorrect authentication header', async () => {
      const result = headerAuthentication(unauthenticatedEvent.headers);
      expect(result).toEqual(false);
    });

    test('should not authenticate when providing an empty authentication header', async () => {
      const result = headerAuthentication(unauthenticatedEventEmpty.headers);
      expect(result).toEqual(false);
    });
  });
});
