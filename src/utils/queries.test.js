import { eventExample } from '../constants';

describe('utils/queries.test.js', () => {
  describe('values used for tests', () => {
    test('must be compliant and data properly formatted', async () => {
      expect(JSON.stringify(eventExample)).toBe('{"body":"{\\"operationName\\":null,\\"variables\\":{},\\"query\\":\\"{__schema { mutationType { kind }}}\\"}","headers":{"gcms-locale":"EN"}}');
    });
  });
});
