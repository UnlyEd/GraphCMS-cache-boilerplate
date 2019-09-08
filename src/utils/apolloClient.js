import { InMemoryCache } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import { createHttpLink } from 'apollo-link-http';
import fetch from 'node-fetch';

import epsagon from './epsagon';

/*
 * XXX This file should be imported using "require" and not "import", because it relies on ENV variables that aren't necessarily set when using "import"
 *  (especially for tests)
 *  But that's also because we weren't returning a function but an object before, but now we do (ApolloClientFactory) so it may be refactored and use consistent imports
 */

const graphCMSError = `Unable to connect to GraphCMS due to misconfiguration. Endpoint: "${process.env.GRAPHCMS_ENDPOINT}", Token: "${!!process.env.GRAPHCMS_TOKEN}"`;

if (!process.env.GRAPHCMS_ENDPOINT || !process.env.GRAPHCMS_TOKEN) {
  epsagon.setError(Error(graphCMSError));
  throw Error(graphCMSError);
}

/**
 * Creates a new instance of Apollo Client
 * Used to perform queries against a GraphCMS endpoint (URI)
 *
 * @param headers Custom headers to send to the GraphCMS API
 * @param uri URI of the GraphCMS API
 * @param token Authentication token of the GraphCMS API, will be send in headers
 * @return {ApolloClient<unknown>}
 * @constructor
 */
export const ApolloClientFactory = (headers = {}, uri = process.env.GRAPHCMS_ENDPOINT, token = process.env.GRAPHCMS_TOKEN) => {
  const apolloClientInstance = new ApolloClient({
    link: createHttpLink({
      uri,
      headers: {
        Authorization: `Bearer ${token}`,
        ...headers,
      },
      fetch,
    }),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'no-cache',
        errorPolicy: 'ignore',
      },
      query: {
        fetchPolicy: 'no-cache',
        errorPolicy: 'all',
      },
    },
  });

  return apolloClientInstance;
};

export default ApolloClientFactory;
