import { createLogger } from '@unly/utils-simple-logger';
import get from 'lodash.get';
import map from 'lodash.map';

import { eventExample } from '../constants';
import { addItemToCache, extractQueryResultsFromItem, printCachedItem } from '../utils/cache';
import epsagon from '../utils/epsagon';
import { extractHeadersToForward, handleGraphCMSCompatibleErrorResponse, runQuery } from '../utils/graphql';
import { generateRedisKey, getClient } from '../utils/redis';

const logger = createLogger({
  label: 'Cache handler',
});

/**
 * This cache endpoint is meant to never fail and always return the data from the cache, for a given query.
 *
 * Cache resolution algorithm:
 *  - Fetch an existing value for the given query, from the cache
 *    - If an existing value exists, then returns it
 *    - If not, then execute the query on GraphCMS endpoint
 *      - Once the query results are received, store them in the cache, using the query (string) as key
 *      - Do not wait for cache to be updated before returning the query results
 *      - If the query results cannot be saved to the cache, then generate an alert through Epsagon + log
 *      - If any errors are returned by GCMS, then return the response, but don't update the cache
 *
 * @param event
 * @param context
 * @return {Promise<{body: (*), statusCode: number}>}
 */
export const cacheQuery = async (event, context) => {
  logger.debug('Lambda "cacheQuery" called.');
  const _headers = event.headers; // Contains all headers sent by the client
  const forwardedHeaders = extractHeadersToForward(_headers); // Contains only the headers meant to be forwarded with the GCMS query
  let redisClient;

  if (process.env.NODE_ENV === 'test') {
    redisClient = getClient(event.__TEST_REDIS_URL || process.env.REDIS_URL, event.__TEST_REDIS_PASSWORD || process.env.REDIS_PASSWORD, 1);
  } else {
    redisClient = getClient();
  }
  const body = get(event, 'body'); // The body contains the GraphCMS query, as a string (respect GraphCMS API standards)
  const redisKey = generateRedisKey(body, forwardedHeaders);
  epsagon.label('body', body); // We store the query in Epsagon logging so that it'll be reported if we report errors to Epsagon
  let query = null;

  try { // Try to parse the query and fail early if we can't
    logger.debug('Parsing the request body...');
    query = JSON.parse(body);
    epsagon.label('query', query);
    logger.debug('The body was parsed successfully into a GraphCMS query.');
    logger.debug(`OperationName: "${query.operationName}"`);
    logger.debug(`Forwarded headers: ${JSON.stringify(forwardedHeaders)}`);
  } catch (e) {
    // XXX If we can't parse the query, then we immediately return an error, since it is considered as a FATAL error from which we can't do anything
    logger.debug('An error occurred when parsing the body, an error will now be sent to the client.', 'FATAL');
    logger.error(e);
    epsagon.setError(e);

    // We return the error message directly, to help with debug (and it's not sensitive)
    return {
      statusCode: 500,
      body: handleGraphCMSCompatibleErrorResponse(`Could not parse the given query, please provide a proper GraphCMS query as "request body". (hint: Body must contain "operationName", "variables" and "query" properties, as a stringified JSON object, such as "${eventExample.body}") \nRequest body: "${body}"`),
    };
  }

  // Fetch a potential query result for the given query, if it exists in the cache already
  let cachedItem;

  try {
    logger.debug(`Fetching GraphCMS query from redis cache...`);
    // XXX If fetching data from redis fails, we will fall back to running the query against GraphCMS API in order to ensure the client gets the data anyway
    cachedItem = await redisClient.get(redisKey);
  } catch (e) {
    logger.debug(`An exception occurred while fetching redis cache.`);
    logger.error(e);
    epsagon.setError(e);
  }

  // If the query is cached, return the results from the cache
  if (cachedItem) {
    logger.debug(`The query was found in the redis cache, here is the item from the redis cache (you can customise this output for debug purpose):`);
    // Change true/false to see the full dataset returned by the cache (for debug) - Or use a custom object to strip specific keys
    printCachedItem(cachedItem, true);

    logger.debug(`The cached result will now be sent to client.`);
    return {
      statusCode: 200,
      body: JSON.stringify(
        extractQueryResultsFromItem(cachedItem),
      ),
    };
  } else {
    logger.debug(`The query was not found in the redis cache.`);
    // If the query isn't cached yet, execute it (through GraphCMS API)
    let queryResults;

    try {
      logger.debug(`Executing GraphCMS query on GraphCMS API...`);
      const { ApolloClientFactory } = require('../utils/apolloClient'); // eslint-disable-line global-require
      let client;

      if (process.env.NODE_ENV === 'test') {
        // Changing variables when running tests on a dedicated test GraphCMS endpoint
        client = ApolloClientFactory(forwardedHeaders, event.__TEST_GRAPHCMS_ENDPOINT, event.__TEST_GRAPHCMS_TOKEN);
      } else {
        client = ApolloClientFactory(forwardedHeaders);
      }
      queryResults = await runQuery(query, client);
    } catch (e) {
      logger.debug(`An exception occurred while fetching GraphCMS API.`);
      logger.error(e);
      epsagon.setError(e);

      return {
        statusCode: 500,
        body: handleGraphCMSCompatibleErrorResponse(String(e)),
      };
    }

    // XXX GraphCMS returns an array of "errors" when errors happen, even if there was only one error thrown
    const queryErrors = get(queryResults, 'errors', []);

    // XXX If a GraphCMS query returns any kind of error we don't add it to the cache, to avoid storing persistent data that aren't reliable
    //  So, we only cache data when they're reliable, to avoid
    if (!queryErrors.length) {
      // If the query was executed successfully, update the cache
      // XXX Asynchronous on purpose - Do not wait for the cache to be updated before returning the query results (perf++)
      addItemToCache(redisClient, body, forwardedHeaders, queryResults)
        .then((result) => {
          if (result !== 'OK') {
            const message = `Redis couldn't save the newer query results to the cache: "${result}"`;
            logger.error(message);
            epsagon.setError(Error(message));
          }
        })
        .catch((error) => {
          const message = `Redis couldn't save the newer query results to the cache, an error happened: "${error}"`;
          logger.error(message);
          epsagon.setError(Error(error));
        });
    } else {
      map(queryErrors, (gcmsError) => {
        const error = `An error occurred on GraphCMS when running the query, the results were therefore not cached to avoid storing non-reliable information. \nGraphCMS Error: "${gcmsError.message}"`;
        logger.error(error);
        epsagon.setError(Error(error));
      });
      logger.debug(`Full GraphCMS API response: \n${JSON.stringify(queryResults, null, 2)}`);
    }
    logger.debug(`The GraphCMS query was executed successfully. Results are now sent to the client.`);

    // XXX Will return the value ASAP (don't wait for the cache to be updated)
    //  If the query failed, will return the results anyway, because it's possible for a GraphQL query to partially fail, but yield results anyway
    //  (it can contains both "data" and "errors") - See https://blog.apollographql.com/full-stack-error-handling-with-graphql-apollo-5c12da407210
    return {
      statusCode: 200,
      body: JSON.stringify(queryResults),
    };
  }
};
