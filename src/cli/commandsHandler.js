import { createLogger } from '@unly/utils-simple-logger';
import map from 'lodash.map';
import logSymbols from 'log-symbols';
import fetch from 'node-fetch';

const logger = createLogger({
  label: 'Emulated client (CLI)',
});

const cacheQueryRoute = '/cache-query';
const refreshCacheRoute = '/refresh-cache';
const resetCacheRoute = '/reset-cache';

if (!process.env.CACHE_BASE_URL) {
  logger.info(`${logSymbols.error} No "CACHE_BASE_URL" defined as environment variable, please make sure you've defined "CACHE_BASE_URL" in the .env.${process.env.NODE_ENV} file.`);
  process.exit();
}

export async function exit() {
  logger.info(`${logSymbols.success} Quitting client`);
  process.exit();
}

export async function sendQuery(query, locale) {
  logger.info(`${logSymbols.info} Querying cache ...`);

  try {
    const { ApolloClientFactory } = require('../utils/apolloClient'); // eslint-disable-line global-require
    const cacheEndpoint = process.env.CACHE_BASE_URL + cacheQueryRoute;
    const headers = {
      'gcms-locale': locale,
      'gcms-locale-no-default': false,
    };
    const client = ApolloClientFactory(headers, cacheEndpoint);
    query = { query }; // eslint-disable-line no-param-reassign
    logger.info(`${logSymbols.info} Sending the following query: \n${JSON.stringify(query, null, 2)}`);
    logger.info(`${logSymbols.info} With headers: \n${JSON.stringify(headers, null, 2)}`);
    const queryResult = await client.query(query);

    if (queryResult.data === undefined) {
      throw Error(`Error when requesting data from ${cacheEndpoint}`);
    }
    logger.info(`${logSymbols.info} Received the following response: \n${JSON.stringify(queryResult)}`);
    logger.info(`${logSymbols.success} OK - Query was executed successfully`);
  } catch (e) {
    logger.error(`${logSymbols.error} ERROR - ${e}`);
    throw e;
  }
}

export async function refreshCache() {
  const url = process.env.CACHE_BASE_URL + refreshCacheRoute;
  const options = { method: 'POST', headers: { 'GraphCMS-WebhookToken': process.env.REFRESH_CACHE_TOKEN } };

  logger.debug(`Sending [${options.method}] "${url}" with headers "${JSON.stringify(options.headers)}"`);
  const result = await fetch(url, options)
    .then((res) => res.json())
    .catch((e) => {
      logger.debug(`An unexpected error happened while fetching "${url}".`);
      logger.error(e);
      throw e;
    });

  if (result.errors) {
    logger.error(`${result.errors.length} error(s) were returned by "${url}":`);
    map(result.errors, (e, index) => logger.error(`  - [${index}] "${e.message}"`));
  } else {
    logger.info(`${logSymbols.success} OK - Cached queries were refreshed`);
    logger.info(`${logSymbols.info} Result:\n${JSON.stringify(result, null, 2)}`);
  }
}

export async function resetCache() {
  const url = process.env.CACHE_BASE_URL + resetCacheRoute;
  const options = { method: 'POST', headers: { 'GraphCMS-WebhookToken': process.env.REFRESH_CACHE_TOKEN } };

  logger.debug(`Sending [${options.method}] "${url}" with headers "${JSON.stringify(options.headers)}"`);
  const result = await fetch(url, options)
    .then((res) => res.json())
    .catch((e) => {
      logger.debug(`An unexpected error happened while fetching "${url}".`);
      logger.error(e);
      throw e;
    });

  if (result.errors) {
    logger.error(`${result.errors.length} error(s) were returned by "${url}":`);
    map(result.errors, (e, index) => logger.error(`  - [${index}] "${e.message}"`));
  } else {
    logger.info(`${logSymbols.success} OK - Cache was reset/wiped`);
    logger.info(`${logSymbols.info} Result:\n${JSON.stringify(result, null, 2)}`);
  }
}
