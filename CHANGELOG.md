CHANGELOG
===

- v2.2.0 - 2019-10-21
    - [Feature] Allow per-customer configuration, backward-compatible but it's a whole new way of defining environment variables using secrets-staging.yml and secrets-production.yml instead of .env.staging and .env.production
- v2.1.6 - 2019-10-02
    - [Enhancement] Handle CORS preflight request - Before today, it wasn't possible to send POST requests to the `/cache-query` endpoint due to CORS preflight check that wasn't allowed. We didn't previously encounter the issue because we were using the same domain/sub-domain. Now, it's possible to connect to the Cache from any domain
- v2.1.5 - 2019-09-25
    - [Enhancement] Improve stability/resilience of /reset-cache endpoint, better handle redis errors - Doesn't spawn one redis connection per call anymore, more resilient to calls received in a batch as well (forces 1 reset max every ~10s)
- v2.1.4 - 2019-09-12
    - [Enhancement] Fix `emulate:demo:production` script - _Wasn't using production environment_
- v2.1.3 - 2019-09-12
    - [Enhancement] Check for `NetworkStatus.ready` instead of `queryResults.errors` (as status already handle those, clearer/proper) when analysing apollo client query result
- v2.1.2 - 2019-09-09
    - [Enhancement] Reuse redis connections for the same lambda container - _A new Redis connection was created at every lambda call before_ 
- v2.1.1 - 2019-09-09
    - [Enhancement] CLI - Reset cache - A new action is available in the CLI and allow to simulate the /reset-cache endpoint
    - [Enhancement] The /cache-query endpoint prints additional debug information regarding fetched items from Redis cache
    - [Enhancement] Changed `yarn lint` to run in watch mode by default, added a new `yarn lint:once` for CI
    - [Enhancement] Run `yarn lint` automatically when running `yarn start` for development env
- v2.1.0 - 2019-09-07 - [Public release](https://github.com/UnlyEd/GraphCMS-cache-boilerplate), internally forked for our private use @Unly - _Boilerplate will be maintained from now on_ 
    - [Enhancement] Headers forwarding - Now forwards some headers alongside the GCMS query. Forwarded headers are:
        - All headers starting with `gcms-`
        - `locale` for backward compatibility with systems using the old `locale` instead of the more recent `gcms-locale`
    - [Feature] Cache reset for WebHooks - New endpoint `/reset-cache` that just flush the whole redis db
- v2.0.0 - 2019-08-11 - Production-ready version
    - [Enhancement] Handle potential redis failure for all endpoint (see [README](./README.md#reliability--resilience---handling-catastrophic-failures-graphcmsredis))
    - [Doc] Massive documentation update
- v1.0.0 - [Alpha/POC version](https://github.com/UnlyEd/graphCMS-cache-contingency-boilerplate-POC) (non-production ready)
