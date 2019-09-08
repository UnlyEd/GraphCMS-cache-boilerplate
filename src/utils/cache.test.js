import { extractCachedItem, extractMetadataFromItem, extractQueryResultsFromItem } from './cache';

describe('utils/cache.js', () => {
  describe('when we extract item from cache', () => {
    test('it should return the extracted item if the item is a string', () => {
      const testObject = { foo: 'bar' };
      expect(extractCachedItem(JSON.stringify(testObject))).toMatchObject(testObject);
    });

    test('return the main item if the item is not a string', () => {
      const testObject = { foo: 'bar' };
      expect(extractCachedItem(testObject)).toMatchObject(testObject);
    });
  });

  describe('when we extract query from extracted item cache', () => {
    test('return null if item is null', () => {
      expect(extractQueryResultsFromItem(null)).toBeNull();
    });

    test('throw an Error if item is undefined', () => {
      expect(() => {
        extractQueryResultsFromItem();
      }).toThrow(Error);
    });
  });

  describe('when we extract metadata from an item', () => {
    test('return null if item is null', () => {
      expect(extractMetadataFromItem(null)).toBeNull();
    });

    test('throw an Error if item is undefined', () => {
      expect(() => {
        extractQueryResultsFromItem();
      }).toThrow(Error);
    });
  });
});
