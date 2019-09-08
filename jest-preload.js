require('dotenv').config({ path: '.serverless/.env' });
process.env.DISABLE_EPSAGON = true; // XXX Avoids tests to crash because we don't init epsagon

if (process.env.NODE_ENV !== 'test') {
  throw Error('Non-test environment');
}

jest.setTimeout(30000); // XXX Avoids tests to crash on slow networks

global.console = {
  log: jest.fn(), // XXX Avoid noise when running tests, such as errors that are meant to be logged (Winston uses console.log instead of console.error for errors)

  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};
