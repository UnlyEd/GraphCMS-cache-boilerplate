CHANGELOG
===

- v2.1.0 - 2019-09-07 - [Public release](https://github.com/UnlyEd/GraphCMS-cache-boilerplate), internally forked for our private use @Unly - _Boilerplate will be maintained from now on_ 
    - [Enhancement] Headers forwarding - Now forwards some headers alongside the GCMS query. Forwarded headers are:
        - All headers starting with `gcms-`
        - `locale` for backward compatibility with systems using the old `locale` instead of the more recent `gcms-locale`
    - [Feature] Cache reset for WebHooks - New endpoint `/reset-cache` that just flush the whole redis db
- v2.0.0 - 2019-08-11 - Production-ready version
    - [Enhancement] Handle potential redis failure for all endpoint (see [README](./README.md#reliability--resilience---handling-catastrophic-failures-graphcmsredis))
    - [Doc] Massive documentation update
- v1.0.0 - [Alpha/POC version](https://github.com/UnlyEd/graphCMS-cache-contingency-boilerplate-POC) (non-production ready)
