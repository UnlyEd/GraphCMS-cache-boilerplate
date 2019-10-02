import { createLogger } from '@unly/utils-simple-logger';
import gql from 'graphql-tag';
import filter from 'lodash.filter';
import startsWith from 'lodash.startswith';
import includes from 'lodash.includes';

const logger = createLogger({ // eslint-disable-line no-unused-vars
  label: 'GraphQL utils',
});

export const GCMS_HEADER_PREFIX = 'gcms-'; // Headers matching this prefix are meant to be forwarded XXX Headers will be automatically forwarded, but if you're subject to CORS requests, then you'll need to manually allow them in serverless.yml for "cache-query" lambda
export const GCMS_HEADERS_WHITELIST = [ // Whitelist of specific headers meant to be forwarded
  'locale', // Keep "locale" header, for backward-compatibility with GCMS previous versions
];

/**
 * Executes a GraphQL query on the GraphCMS API endpoint.
 *
 * @param query Query to perform
 * @param client Apollo client instance to use to send the query, specifies extra configuration, such as headers (authentication, etc.)
 * @return {Promise<ApolloQueryResult<any>>}
 */
export const runQuery = async (query, client) => {
  if (!client) {
    throw Error('An Apollo client is required to perform the query');
  }

  if (typeof query === 'string') {
    throw Error('The "query" parameter should be a JS object - Did you forgot to JSON.parse() it?');
  }

  query.query = gql`${query.query}`; // eslint-disable-line no-param-reassign
  return client.query(query);
};

/**
 * Build an error that is ISO with GraphCMS API
 * Errors must be of the same structure as GraphCMS errors, so clients can handle them the same way
 *
 * @param message
 * @return {{message: *}}
 */
export const buildGraphCMSError = (message) => {
  return {
    message: `[Cache] ${message}`,
  };
};

/**
 * Build a HTTP response body that is ISO with GraphCMS API.
 * The HTTP response of the cache must be similar to GraphCMS API responses, so that clients handles them the same way.
 *
 * Errors must therefore follow the following structure:
 * errors: (array)
 *   error: (object)
 *     message (string)
 *
 * Other fields, such as "locations" are not required (debug purpose, optional)
 *
 * @example GraphCMS error example (fetching non-existing field)
 *
 {
    "loading": false,
    "networkStatus": 7,
    "stale": false,
    "errors": [
      {
        "message": "Cannot query field \"names\" on type \"Organisation\". Did you mean \"name\"?",
        "locations": [
          {
            "line": 3,
            "column": 5
          }
        ]
      }
    ]
  }
 *
 * @param error
 * @return {string}
 */
export const handleGraphCMSCompatibleErrorResponse = (error) => {
  return JSON.stringify({
    data: {},
    errors: [buildGraphCMSError(error)],
  });
};

/**
 * Make a GraphQL query readable by removing all unnecessary information and ony keep a limited set of characters.
 * Strip all \n and non-useful characters.
 *
 * @param query
 * @param maxLength
 * @param truncatedSuffix
 * @return {string}
 */
export const makeQueryHumanFriendly = (query, maxLength = 50, truncatedSuffix = ' ... (truncated)') => {
  // Simplify the displayed query to make it more readable, remove \n, convert multiple spaces to single spaces and limit the length
  let queryString = query.split('\n').join('').split('  ').join(' ').split('  ').join(' '); // eslint-disable-line newline-per-chained-call

  if (queryString.length > maxLength) {
    queryString = queryString.substring(0, maxLength) + truncatedSuffix;
  }

  return queryString;
};

/**
 * Filter out all headers that aren't meant to be forwarded to a GraphCMS endpoint when running a query.
 *
 * @param headers
 */
export const extractHeadersToForward = (headers) => {
  const forwardedHeaders = {};

  filter(headers, (value, key) => {
    if (startsWith(key, GCMS_HEADER_PREFIX)) { // Keep headers starting with GCMS_HEADER_PREFIX
      forwardedHeaders[key] = value;
    } else if (includes(GCMS_HEADERS_WHITELIST, key)) { // Keep headers that are whitelisted specifically
      forwardedHeaders[key] = value;
    }
  });

  return forwardedHeaders;
};
