[![Maintainability](https://api.codeclimate.com/v1/badges/8fdeb19d924c1e617e45/maintainability)](https://codeclimate.com/github/UnlyEd/GraphCMS-cache-boilerplate/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/8fdeb19d924c1e617e45/test_coverage)](https://codeclimate.com/github/UnlyEd/GraphCMS-cache-boilerplate/test_coverage)
[![AWS CodeBuild](https://codebuild.eu-west-1.amazonaws.com/badges?uuid=eyJlbmNyeXB0ZWREYXRhIjoiTURJRG1RT0taenZITE5RV1lPTWM0WGpZTUZPQWpNTUg3WE1NWFhWOGhrL0lkblpyWWczMVVjWkdSeUw1VldLQll1VURBMTlmSjc0VXpTOTU2SWpKUlFBPSIsIml2UGFyYW1ldGVyU3BlYyI6Im9vQjk4cWprWE9yOWNOUVQiLCJtYXRlcmlhbFNldFNlcmlhbCI6MX0%3D&branch=master)](https://eu-west-1.console.aws.amazon.com/codesuite/codebuild/projects/GraphCMS-cache-boilerplate)

# GraphCMS Cache Contingency service

> The main goal of this service is to provide a **reliable cache contingency backup plan** in case a GraphCMS endpoint is failing.
This service most important priority is the **service reliability**, not the **data consistency**, which may not always be up-to-date.
>
> This Cache service is meant to run **on your own AWS account**, and be managed **by yourself**. 
> It is powered by the [Serverless Framework](https://serverless.com/). 
> It uses another 3rd party tool for monitoring the service: [Epsagon](https://epsagon.com/) _(free plan is most likely enough)_.
>
> It is a whole service meant to be used by developers/teams who rely on GraphCMS,
> and are looking for a **safe and reliable way** to provide services to their own customers.
>
> **You keep complete ownership of this service**, as it runs under your plan, and **you are free to make any change to fit your business**.
>
> **P.S**: Please share the awesome things you build with the community!

## Overview
### _"Why/when should I use this?"_

- _"I don't use [GraphCMS](https://graphcms.com/), is this any useful to me?"_: 
    - **No**, it's likely not. 
    This service is meant to be a proxy server between you apps and your GraphCMS API endpoint. 
    It's completely useless if you don't use GraphCMS in the first place.
- _"I want to protect our apps against unpredictable outages from GraphCMS (or its 3rd party services), will this help me?"_:
    - **Yes**, it will. Read on!
- _"I want to lower our GraphCMS cost by reducing the number of calls hitting their API, will this help me?"_:
    - **Yes**, it will. Read on!
- _"I use frontend apps (react, angular, vue, etc.) and want to hide our GraphCMS API credentials that are currently visible in the browser source code, will this help me?"_:
    - **Yes**, it will. Read on!
- _"I want to improve the performance of our apps that rely on GraphCMS API, will this help me?"_:
    - **Yes**, it will. Read on!
- _"I want to run some automated data transformations after fetching those from GraphCMS API, will this help me?"_:
    - It **could**, but it's not the main purpose. 
    It could be a good place to start though, give it a try and see for yourself!
- _"I'm just looking for something simple to setup that will just act as a temporary cache (caching mechanism on a limited period), is this still for me?"_:
    - **Yes**, this project provides many benefits/features, but it's possible to only use it as a **temporary caching mechanism** _(instead of cache contingency as it was meant to be at the beginning)_.
    See [Alternative strategy - Refresh the cache automatically by making it temporary](#alternative-strategy---refresh-the-cache-automatically-by-making-it-temporary)
- _"I'm running a multi-tenants business, can you help about that?"_:
    - **Yes**, we do. We also run a multi-tenants business, meaning we have a dedicated service _(AWS Lambda, API GW, Redis instance, domain name)_ **for each of our customers**.
    We therefore provide easy-to-use scripts, which allow you to manage each of those services from a centralised point.
    The only common point between the customers is that they all depend on the same GraphCMS API endpoint. _(and, if that's not your case, you could change that quite simply!)_

### _"How should I use it?"_

- **_"I am just curious"_**: 
    - **Clone** the project, play around, run it on your local computer, deploy the service against your own AWS infrastructure and see how it works. 
    _(don't forget to remove your service from AWS, once you're done playing around!)_
- **_"I'm thinking using it for a professional project"_**: 
    - **Fork** the project, build you own stuff on top of it if you need to, keep up to date with the main project if needed (new features, bug fix, etc.), 
    you'll be in control with the ability to quickly/simply catch up if ever needed.
    And this project comes with [some handy built-in scripts to help you keep it in sync!](#keeping-your-fork-up-to-date-with-this-boilerplate)

---
## Benefits

Using this service instead of directly hitting a GraphCMS endpoint provides the following benefits:

1. **Contingency backup plan for a GraphCMS endpoint**: 
    If a GCMS endpoint is failing (whether it's a bug, planned maintenance, etc.), then all customers would be affected at once (app crash, etc.).
    As we cannot let this happen for obvious reasons, the goal of this contingency cache is to take over if GCMS is failing, using a redis cache to return data cached by a previous request instead of crashing the app.
1. **Auth proxy**: 
    Also, this service acts as a proxy, and can be used to hide authentication credentials from the client (front-end apps).
    This way, credentials such as GCMS API token are only used here, from this service, on the server side, and are therefore safe.
1. **Cost mitigation**: 
    As we won't hit the GCMS API directly, but most requests are gonna be cached, the GraphCMS usage cost will decrease.
    On the other hand, additional costs from the AWS Lambda, API Gateway and redis will apply. (but it's much less expensive)
    **Additionally**, as you limit the number of requests that are handled by GraphCMS, you can go over your plan limit without suffering from your endpoint to be taken down (free plans, for instance, are automatically taken down when over limit).
    If you use a free plan to serve real customers, this service will allow you to increase your applications reliability and serve even more customers before upgrading your plan.
1. **Performances**: 
    As we don't run a whole GraphCMS query every time but just return cached results, this has benefits on performances (mostly network speed).
1. **Additional data processing**: 
    As this service acts as a proxy, it could also perform additional data processing, such as aggregations, that aren't available natively with GraphCMS.
    _This is a possibility, but not the main purpose. And it's out of the scope for now, but could come in handy later._

---

<!-- toc -->

- [Getting started](#getting-started)
  * [_"How do I configure my app that currently queries GCMS API directly, and use my newly created cache service instead?"_](#_how-do-i-configure-my-app-that-currently-queries-gcms-api-directly-and-use-my-newly-created-cache-service-instead_)
- [Cache workflow, and cache invalidation strategies](#cache-workflow-and-cache-invalidation-strategies)
  * [Cache behaviour](#cache-behaviour)
    + [Cache strategy](#cache-strategy)
  * [Cache invalidation strategies](#cache-invalidation-strategies)
    + [Strategy 1 - Automatically refresh all queries cached in redis, when a change is made on GraphCMS](#strategy-1---automatically-refresh-all-queries-cached-in-redis-when-a-change-is-made-on-graphcms)
    + [Strategy 2 - Wipe the whole cache, when a change is made on GraphCMS](#strategy-2---wipe-the-whole-cache-when-a-change-is-made-on-graphcms)
    + [Alternative strategy - Refresh the cache automatically by making it temporary](#alternative-strategy---refresh-the-cache-automatically-by-making-it-temporary)
    + [Strategy X - Open an issue if you'd like to either implement or request another strategy!](#strategy-x---open-an-issue-if-youd-like-to-either-implement-or-request-another-strategy)
  * [Cache version history](#cache-version-history)
- [Reliability & resilience - Handling catastrophic failures (GraphCMS/Redis)](#reliability--resilience---handling-catastrophic-failures-graphcmsredis)
- [Logging and debugging](#logging-and-debugging)
  * [Own logs](#own-logs)
  * [Epsagon](#epsagon)
    + [Pricing](#pricing)
    + [Opt-out](#opt-out)
    + [Known issues with Epsagon](#known-issues-with-epsagon)
- [API endpoints and usages](#api-endpoints-and-usages)
  * [Cache endpoint](#cache-endpoint)
  * [Cache invalidation endpoint (refresh)](#cache-invalidation-endpoint-refresh)
  * [Cache invalidation endpoint (reset)](#cache-invalidation-endpoint-reset)
  * [Read cached keys/GQL queries from cache](#read-cached-keysgql-queries-from-cache)
  * [Status](#status)
- [Advanced notions](#advanced-notions)
  * [Multi customer instances](#multi-customer-instances)
- [Keeping your fork up to date with this boilerplate](#keeping-your-fork-up-to-date-with-this-boilerplate)
- [Testing](#testing)
  * [Known issues with testing](#known-issues-with-testing)
- [CI with AWS CodeBuild](#ci-with-aws-codebuild)
- [Redis](#redis)
  * [Known Redis limitations](#known-redis-limitations)
  * [Select Subscription plan](#select-subscription-plan)
  * [Database configuration](#database-configuration)
    + [Data eviction policy](#data-eviction-policy)
    + [Password](#password)
- [Other known limitations and considerations](#other-known-limitations-and-considerations)
- [Contributing](#contributing)
  * [Versions](#versions)
    + [SemVer](#semver)
    + [Release a new version](#release-a-new-version)
  * [Code style](#code-style)
  * [Working on the project - IDE](#working-on-the-project---ide)

<!-- tocstop -->

## Getting started

Watch this 10mn video to understand and see it in action!

[![GraphCMS Cache COntingency in action](https://img.youtube.com/vi/k4Bd-XHmiBM/0.jpg)](https://youtu.be/k4Bd-XHmiBM)

Clone the repo, then configure your local install:

- `nvm use` or `nvm install` _(optional, just make sure to use the same node version as specified in `/.nvmrc`)_
- `yarn install`
- Configure your `/.env.development` and `/.env.test` files _(only the GraphCMS credentials are really necessary, if you're just playing around)_
- `yarn start` # Starts at localhost:8085
- Go to `/status` and `/read-cache`
- `yarn emulate:local` play around with fake queries sent to `http://localhost:8085` and go to `/read-cache` to see changes

**Before deploying on AWS:**
- Change the [serverless.yml](serverless.yml) configuration to match your needs
    - If you're just playing around and aren't using a **custom domain** to deploy to, then comment out the `serverless-domain-manager` plugin
    - Fill in the `redis.url` for the project you meant to deploy
    
On AWS (staging):
- _You'll need to create a `.env.staging` file first_
- `yarn deploy:demo` (you may want to either disable or configure the [`serverless-domain-manager`](https://github.com/amplify-education/serverless-domain-manager#readme) plugin)
- `yarn emulate:client:demo` to send queries to your staging endpoint and manually test the behavior there

On AWS (prod):
- _You'll need to create a `.env.production` file first_
- `yarn deploy:demo:production`
- `yarn emulate:client:demo:production` to send queries to your production endpoint and manually test the behavior there

If you've decided to clone/fork this project, please do the following:
- Change [AWS CodeBuild buildspec.yml](./buildspec.yml) file _(for Continuous Integration)_:
    - The project is configured to use AWS CodeBuild, we also use CodeClimate for code quality. 
        [`slack-codebuild`](https://github.com/UnlyEd/slack-codebuild) is used to send build notification to a slack channel _(it's MIT too)_
    - `SLACK_WEBHOOK_URL`: **Use your own or remove it**, or your build notification will appear on **our** slack channel _(please don't do that)_
    - `CC_TEST_REPORTER_ID`: **Use your own or remove it**, or your build results will be mixed with our own
    - For additional documentation, see [CI with AWS CodeBuild](#ci-with-aws-codebuild)

### _"How do I configure my app that currently queries GCMS API directly, and use my newly created cache service instead?"_

It really depends on the implementation of you app here.
If you're using react with Apollo for instance, it's just a matter of changing the endpoint to target your cache (`/cache-query` endpoint) rather than your GCMS endpoint, and not use any credentials (the cache doesn't need any).

It should be simple and straightforward, as it's just a matter of fetching your cache `/cache-query` endpoint instead of hitting your GraphCMS endpoint directly.

> Testing with a non-production application is strongly recommended to begin with. 
> Also, use a `QUERY` GraphCMS token, you don't need to use a token that can write, read is enough and therefore **more secure**.

---

## Cache workflow, and cache invalidation strategies
### Cache behaviour

> This Cache uses a mix of GraphQL query and headers as index (redis key), and GCMS API responses as values (redis value).

- It uses Redis as caching engine.
- A redis key can hold up to 512MB of data _(it's therefore not a limitation, we won't ever reach that much data in a GraphQL query)_

#### Cache strategy

> "Always reliable, eventually synchronized"

This Cache service will **always return the value from the redis cache**. 
**_It will never check if a newer value exists on the GCMS's side._**

Therefore, it may not be in-sync with the actual values held by GCMS.

Due to this behaviour, this Cache service would never send fresher data on its own. 
That's why there is are different "**cache invalidation**" strategies.

### Cache invalidation strategies

Those strategies are optional and you are not required to use any of them. You may use none, one, or several, as you decide.
We implemented the **Strategy 1** first, and then switched to the **Strategy 2** which is less complex and more reliable in our use-case.

#### Strategy 1 - Automatically refresh all queries cached in redis, when a change is made on GraphCMS
> This strategy is very useful if you have lots of reads and very few writes.
>
> It is very inefficient if you write a lot in GraphCMS (like automated massive writes). 
> It doesn't play nice if you write a lot in GraphCMS (like automated massive writes in batches, such as massive data import). 

On GCMS's side, a **WebHook** is meant to **trigger** a **cache invalidation** every time a change is made in the data held by GCMS.

> WebHooks can be configured from there: https://app.graphcms.com/YOURS/staging/webhooks
> Each stage has its own WebHooks.

The WebHook should be configured to hit the **cache invalidation endpoint** (`/refresh-cache`), which will run a query for all existing keys in the redis cache.
Note that the cache will only be invalidated if the refresh query to GCMS API actually worked. So, if GCMS API is down during the cache refresh, the cache won't be changed. (there is no retry strategy)
This is an important detail, as the cache should always contain reliable data.

_Reminder_: The cache uses a Redis storage, with the **query** (as string) used as **key**, and the **query results** (as json) used as **value**.

> In short, every time **any data is changed in GCMS**, **the whole cache is refreshed**.

**N.B**: Special protection has been put in motion to avoid concurrent access of the `/refresh-cache` endpoint.
Only one concurrent call is authorized, it is gracefully handled by the [`reservedConcurrency` option in serverless.yml](https://itnext.io/the-everything-guide-to-lambda-throttling-reserved-concurrency-and-execution-limits-d64f144129e5).

**Known limitations**: 
- This strategy hasn't been designed the best way it could have been, and **suffer from some rare race conditions**.
It may happen, in the case of a massive write (such as an automated import tool that performs lots of writes really fast (like 100-200 writes in 30-50 seconds))
that the `/refresh-cache` endpoint will be called several times (despite the concurrency lock), because the import script takes so long, and multiple calls to `/refresh-cache` are executed.

    The **bad thing** is that the last call that fetches data from GraphCMS API and store them in the cache isn't necessarily executed at last, 
and it may happen that the data stored in the cache isn't the most recent version.

    The proper way to tackle this issue would be to use a `queue`, with a `debounce` strategy. 
    Basically wait until there are no more received request and then perform the cache refresh (instead of immediately performing the cache refresh).

    Unfortunately, we ran out of time and didn't tackle this issue yet. (_instead, we implemented Strategy 2, which is simpler_)
    We're also not really familiar with queue services (SQS, SNS, EventBridge, ...) and don't know which one would be the best for the job.
    
    **Contributor help needed!**: That would be a very appreciated contribution! We'd definitely love a PR for this :)
- If there are many queries stored in redis (hundreds), they may not all resolve themselves in the 30sec limit imposed by API GW.
In such case, they'd likely start to fail randomly depending on GCMS API response time, and it'd become very difficult to ensure the integrity of all requests.
It'd also (in the current state) be very hard to fix.

    One possible way to tackle this issue would be to spawn calls (async, parallel) to another lambda, who's role would be to refresh one query only
    We only have a handful of queries in our cache, so we're not affected by this limitation yet and aren't planning on working on it anytime soon.

#### Strategy 2 - Wipe the whole cache, when a change is made on GraphCMS

> This strategy is very useful if you have lots of reads and very few writes.
>
> It is very inefficient if you write a lot in GraphCMS (like automated massive writes). 

Much simpler and fixes several downsides suffered by Strategy 1, such as:
- Much easier to debug (easier to reason about)
- No edge case where we'd fetch data that will be updated again in a few secs (more reliable, data will always up to date after a cache reset)
- Remove unused queries from the cache at a regular interval (if your queries change for instance), avoids to end up fetching queries that aren't meant to be used anymore
- No timeout even if there are hundreds/thousands of queries in the cache (since they won't all be refreshed at the same time, but simply wiped from the cache all at once)
- Eventually consumes less resources (CPU/RAM) > cheaper _(not significant)_

**Known limitations**:
- Because there is no automated refill of the cache, it will be filled when a customer performs an action that generate a query.
If that query is rarely executed, it may happen that it's executed during an outage, and the query would therefore fail, potentially crashing your app.
- If the cache reset happens during a GCMS outage, then your app will crash anyway. We don't check that GCMS is up and running before performing the cache reset.

    **Contributor help needed!**: If you know a way to detect GraphCMS status and therefore avoid a cache reset during an outage, we're very interested.
    To our knowledge, they don't have any automated too we could rely on to detect this before wiping all the data from the cache, but that'd definitely be a nice addition! 


#### Alternative strategy - Refresh the cache automatically by making it temporary

This is more a workaround than a real feature, but because all the data sent in the request `body` are used as redis key, to index a query's results, you can take advantage of that.

In GraphQL, all queries _(and mutations)_ accept an `operationName`:

For instance, the following GraphQL query:

```graphql
    query {
        __schema {
            mutationType {
                kind
            }
        }
    }
```

Will yield the following request `body`:
```json
{
    "operationName": null,
    "variables": {},
    "query": "{ __schema { mutationType { kind } }}"
}
```

Here, the `operationName` is `null`. 
But if you specify it (`query myQueryName {}`) then it will reflect in the `operationName`, 
and this field is also used **to index** the query in redis.

So, if you wanted to to automatically invalidate your cache every hour, you could just make the `operationName` dynamic, 
such as `query myQueryName_01_01_2019_11am {}`.
This way, since the value would change every hours, a different GraphQL query would be sent every hour, 
and the key used by redis would therefore be different every hours, leading to a cache refresh because the newer query would actually be executed on GraphCMS API before being cached.

This is a nice workaround that allows you to define very precisely a different strategy, which works very differently and could basically be used to ensure the cached data is refreshed periodically.
On the other hand, it wouldn't protect against outages, because it wouldn't handle a fallback strategy. (if graphcms is down when a new query is executed for the first time, then it'd fail)

But that's still nice to know, and perfectly fit a "simple cache strategy" use-case.

#### Strategy X - Open an issue if you'd like to either implement or request another strategy!

> Disclaimer: We'll likely not have the time to add another strategy if we don't need it ourselves.
> But, feel free to open an issue and let's discuss it, we'll gladly advise you regarding the implementation details and discuss it together.

### Cache version history

Using a protected endpoint `/read-cache`, you can visualise all **queries** (redis indexes) that are stored in the cache.

For each query, there is a `version` and `updatedAt` fields that helps you understand when was the cached value refreshed for the last time (and how many times since it was initially added).

Structure example:
```json
{
    "createdAt": 1564566367896,
    "updatedAt": 1564566603538,
    "version": 2,
    "body": {
        "operationName": null,
        "variables": {},
        "query": "{ organisations { name __typename }}"
    }
}

```

> Good to know: 
> - The `body` is the object representation of the `gql` version of the query. _(basically, what's sent over the network)_
> It contains a `query`, which is the string representation of the query.
> - The `body.query` is sanitized and doesn't fully represent the key stored on redis (trim of `\n`, truncated (50 chars), etc.), for the sake of readability.
> - There is **no way to see the data from this endpoint** _(as it could be sensitive)_, only the keys are shown. (it's also password protected in case of, see `BASIC_AUTH_PASSWORD`)

---

## Reliability & resilience - Handling catastrophic failures (GraphCMS/Redis)

This service must be resilient and reliable. It relies on Redis when the GraphCMS endpoint is down.

> But, what happens if Redis fails instead of GraphCMS? 

In such scenario, the outcome depends on the Cache API endpoint used:
- `/cache-query`: A Redis error when searching for a previous query result is gracefully handled and redis is bypassed, a request is therefore sent to the GraphCMS endpoint and results are returned to the client.
                    This makes the service very reliable, as clients will still receive proper results, even if Redis is down.
                    In the catastrophic case where both GraphCMS and Redis are down at the same time, a 500 response will be returned to the client.
- `/refresh-cache`: This endpoint cannot work without a working redis connection, and will therefore return a 500 response.
- `/reset-cache`: This endpoint cannot work without a working redis connection, and will therefore return a 500 response.
- `/read-cache`: This endpoint cannot work without a working redis connection, and will therefore return a 500 response.

> The most important endpoint is `/cache-query`, as it's what's used by the clients that attempt to fetch data from GraphCMS.
> Therefore, it's the most resilient, and will return proper results even if GraphCMS is down _(only if the query was executed previously and the query result was properly cached)_, or if Redis is down (by re-playing the query through GraphCMS).
> But, it can't handle both being down simultaneously.

---

## Logging and debugging

### Own logs
We use a [`logger`](https://github.com/UnlyEd/utils-simple-logger) instance of [Winston](https://github.com/winstonjs/winston#readme) which is configured to silent logs on production environments that aren't of level `error` or higher.

Logs on AWS (CloudWatch) can be accessed by running:
- `NODE_ENV=production yarn logs:cache-query`
- `NODE_ENV=production yarn logs:read-cache`
- `NODE_ENV=production yarn logs:refresh-cache`
- `NODE_ENV=production yarn logs:status`

If no `NODE_ENV` is defined, `staging` environment is used by default.

### Epsagon

[Epsagon](https://epsagon.com/) is a tool that helps troubleshoot what happens on AWS. 
It allows to see what happens on the backend, by analysing I/O network calls and generates graphs, that are very helpful to pinpoint a problem's source. ([See blog](https://epsagon.com/blog/introducing-trace-search/))

Traces are configured within the project, the only required information is the `EPSAGON_APP_TOKEN` environment variable.
Traces are the most interesting feature of Epsagon, and what you may eventually pay for. They allow you to visually understand what happens on the backend, and get meaningful information such as delays, return codes, logs, etc.

Also, Epsagon can be used as a monitoring service, through it's `setError` function. (it's manually disabled in `test` environment through the `DISABLE_EPSAGON` env variable)

Errors catch through `setError` are handled by Epsagon as `Exception` and can be redirected to a slack channel using their [alerts service](https://dashboard.epsagon.com/alerts).

They are very active on their slack and offer engineering-level support.

#### Pricing
Epsagon comes with a Free plan that enjoys 100.000 traces/month, which is more than enough for our use-case.
See [their pricing page](https://epsagon.com/pricing/) for more information.

#### Opt-out
Epsagon will [automatically be disabled](./src/utils/epsagon.js) if you don't provide a `EPSAGON_APP_TOKEN` environment variable.

> Epsagon is disabled in `test` environment, see [jest-preload.js](./jest-preload.js).

#### Known issues with Epsagon

- Epsagon proposes a [Serverless plugin](https://github.com/epsagon/serverless-plugin-epsagon), which **we do not use** because it doesn't play well with our `basic-auth` Authorizer. _(issue on their side with AWS API GW)_
- Epsagon generates a `API GW > Lambda > API GW` infinite loop on `/refresh-cache` when used. It has therefore been disabled for that particular endpoint, see ["FIXME"](serverless.yml).
    If you are interested in the issue, watch [this](https://www.youtube.com/watch?v=pSAQBrr6ZtM&feature=youtu.be) and [this](https://www.youtube.com/watch?v=dbndplk_O2U), basically generated 10k calls in 1h, cost $3.

---

## API endpoints and usages

### Cache endpoint

> POST `/cache-query`

- Expects a GraphQL query as `body`. _(the same way it's natively handled by GCMS API)_
- Forwards the query to GCMS API (if not cached already). _(will be executed by GCMS API)_
- Returns the query results (from GCMS API or from the redis cache).

### Cache invalidation endpoint (refresh)

> POST `/refresh-cache`

- Doesn't expect any particular parameter.
- Refresh all cached data by running all cached queries against GCMS API.
- May be configured through your GraphCMS WebHook, so that any data modification trigger the WebHook, which will in turn refresh all cached data.

> Protected by an authorization Header `GraphCMS-WebhookToken` that must contain the same token as the one defined in your REFRESH_CACHE_TOKEN environment variable

### Cache invalidation endpoint (reset)

> POST `/reset-cache`

- Doesn't expect any particular parameter.
- Reset (wipe/flush) the whole redis cache.
- May be configured through your GraphCMS WebHook, so that any data modification trigger the WebHook, which will in turn invalidate all cached data.

> Protected by an authorization Header `GraphCMS-WebhookToken` that must contain the same token as the one defined in your REFRESH_CACHE_TOKEN environment variable

### Read cached keys/GQL queries from cache

> GET `/read-cache`

- Doesn't expect any particular parameter
- Display all cached queries

> Protected by Basic Auth, see `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` env variables.

### Status

> GET `/status`

- Used by AWS Health Checks to warm the lambda. _(production env only)_
- Can also be used to check if the lambda is running, which node version, from which git commit, etc.

---

## Advanced notions

### Multi customer instances
This service also support the deployment and management of multiple redis caches - one per customer.

Basically, it allow to spawn multiple Cache services, with each its own Redis connection.

Following this scheme makes each instance completely separated from others, with its own redis cache, its own Lambda and own API Gateway.
It not more expensive either (assuming you're using a free RedisLabs plan), since the AWS infrastructure is on-demand it'd cost the same whether all the load is on one lambda, or separated on multiple lambdas
See [Limitations](#limitations).

It would still be possible to use just one redis instance with different databases (one db per customer, but the same connection for all).
It really depends on your Redis service. Though, spearation by clusters is not handled by our Cache system. _(feel free to open a issue and propose a PR!)_

---

## Keeping your fork up to date with this boilerplate

In case you forked the project and you'd like to keeping it up to date with this boilerplate, here are a few built-in scripts to help you out:
- (from your fork) `yarn sync:fork` will `git pull --rebase` the boilerplate `master` branch into your own
- (from your fork) `yarn sync:fork:merge` will `git pull` the boilerplate `master` branch into your own

This is meant to be used manually, if you ever want to upgrade without trouble.

**N.B**: Using the rebase mode will force you to force push afterwards (use it if you know what you're doing). 
Using merge mode will create a merge commit (ugly, but simpler). _We use the rebase mode for our own private fork._

---

## Testing

You can run interactive tests using Jest with `yarn test` script.

[CodeBuild](./buildspec.yml) is configured to run CI tests using `yarn test:coverage` script.

### Known issues with testing

- `test:coverage` script is executed with `--detectOpenHandles --forceExit` options, because the tests aren't closing all redis connections and jest hangs and don't send the coverage report if we don't force it with `--forceExit`.
    We were't able to figure out the source of this, as it is very hard to see when connections are open/closed during tests. _(Note to self: May be related with `beforeEach/afterEach` that aren't executed on children `describe > test`)_

---
## CI with AWS CodeBuild

> This step is useful only if you've **forked/cloned** the project and want to configure CI using AWS CodeBuild.

Using the [AWS Console > CodeBuild](https://eu-west-1.console.aws.amazon.com/codesuite/codebuild/project/new?region=eu-west-1):

> Watch the [video tutorial](https://www.youtube.com/watch?v=30Uikocfdp0&feature=youtu.be)
>
> _**Disclaimer**: We forgot to enable "**Privileged**" mode in the video, for the `Environment > Image > Additional configuration` and had to go to `Environment > Override image` to fix it._

- Go to Create build project
- Fill the project name and description, also, enable Build Badge (in case you ever want to use it)
- **Source** :
    - Select, as Source provider, Github
    - Make sure you're logged in to GitHub
    - Then, select **Repository in my GitHub account** and enter the url of your project
    - Use Git clone depth: Full to avoid issues with failing builds due to missing fetched commits, necessary when using Code Climate coverage feature for instance
    - If you use git submodules, check the option (WARNING: If you are using private repositories as submodule, please use the HTTPS instead of SSH)
- **Primary source webhook events**
    - Check **Rebuild every time a code change is pushed to this repository**
    - Select the events that should trigger a build (all events are recommended, push and PR created/updated/reopened and merged)
- **Environment**
    - We advise you to use a Managed image instead of a Custom image
    - Also, because of the pricing, please only use Ubuntu as Operating system
    - Service role, select New service role
    - Leave default values for timeout, queued timeout, certificate and VPC
    - Compute, use the lowest configuration (for a lower cost) so 3GB memory, 2vCPUs
    - Use **Privileged** mode, necessary because we spawn a docker instance in our tests
- **Buildspec**
    - The most explicit way to work with CI / CD is to use buildspec (instead of build command) - And it's already configured in this project
    - Leave default Buildspec name
- **Artifacts**
    - No artifacts is required for CI. For CD, you can use S3 to provide files to codeDeploy.
- **Logs**
    - Cloudwatch logs are good way to check builds and debug in case of fail.
    - No need to store logs data on S3

---
## Redis

> We created our Redis instances on [Redis Labs](https://app.redislabs.com/#/subscription/new/plan).

### Known Redis limitations

As we run on a Free plan, there are a few limitations to consider:
- Data storage on redis is **limited to 30MB**, which is enough for our use-case, but may be a limitation
- The free plan offers a **limited set of 30 active connections**, you'll get an email warning you when you reach a 80% threshold
- Your instance will be **automatically deleted if not used for 30 days**, you'll get an email 3 days before and 24h before

> Due to those limitations, we strongly recommend to run this service with one instance per customer (multi-tenants)
> This way, you will avoid edge cases such as:
> - CustomerA triggering too many connections, which would take down CustomerD.
> - Adding a CustomerZ, which caches a bit more data that goes over the 30MB limit, hence impacting all your customers.
> - Trigger a cache refresh will refresh all queries, without knowledge of "to whom" belongs the query/data, which may likely not be what you want. 
>   Using a dedicated redis instance per customer fixes that too.

### Select Subscription plan

One important thing not to miss when creating the Subscription, is to select the right availability zone (AZ), which depends on where you're located.
We selected `ue-west-1`, which is Ireland, because it's the closer from us.

You won't be able to select a different AZ in free plan, so choose carefully. 
The database can only be created in the same region as the one selected for the subscription.

### Database configuration

Once a subscription is created, you can create a database (our redis instance).

#### Data eviction policy
A redis instance can be configured with those values:

- `noeviction`: returns error if memory limit has been reached when trying to insert more data
- `allkeys-lru`: evicts the least recently used keys out of all keys
- `allkeys-lfu`: evicts the least frequently used keys out of all keys
- `allkeys-random`: randomly evicts keys out of all keys
- `volatile-lru`: evicts the least recently used keys out of keys with an "expire" field set
- `volatile-lfu`: evicts the least frequently used keys out of keys with an "expire" field set
- `volatile-ttl`: evicts the shortest time-to-live and least recently used keys out of keys with an "expire" field set
- `volatile-random`: randomly evicts keys with an "expire" field set

> The recommended choice is `allkeys-lfu`, so that the impact of re-fetching data is minimised as much as possible.

#### Password

> Use the same database password for all redislabs accounts that contain a redis instance related to the staging environment.
> Same goes for production, we use the same password for all production instances.

This way, it's much easier to manage (one password per environment, not one per env/customer). 

---

## Other known limitations and considerations

- The `/refresh-cache` endpoint has a timeout of 30 seconds. 
    There is no built-in way to handle workload longer than 30s yet.
    This can be an issue if there are too many GraphCMS queries in the redis cache (which will trigger a TimeOut error), 
    as they may not all be updated when trying to invalidate the redis cache.
    If a timeout happens, you can know which keys have been updated by looking at `/read-cache` `updatedAt` data, 
    but there is no built-in way to automatically handle that limitation (yet).
    Also, it's very likely that even if you run `/refresh-cache` multiple times, since the redis keys are gonna be refreshed in the same order, 
    it therefore should fail for the same keys across multiple attempts. (but it also depends on how fast GCMS API replies to each API calls, and that's not predictable at all)
- When the `/refresh-cache` or `/read-cache` are called, the `redis.keys` method is used, which is blocking and not recommended for production applications. 
    A better implementation should be made there, probably following [this](https://github.com/luin/ioredis#streamify-scanning).
    It is not such a concern though, since those endpoints should rarely be called, and it won't be an issue if the redis store doesn't contain lots of keys anyway.

---

## Contributing

### Versions

#### SemVer

We use Semantic Versioning for this project: https://semver.org/. (`vMAJOR.MINOR.PATCH`: `v1.0.1`)

- Major version: Must be changed when Breaking Changes are made (public API isn't backward compatible).
  - A function has been renamed/removed from the public API
  - A function's return value has changed and may break existing implementations
  - Something has changed that will cause the app to behave differently with the same configuration
- Minor version: Must be changed when a new feature is added or updated (without breaking change nor behavioral change)
- Patch version: Must be changed when any change is made that isn't either Major nor Minor. (Misc, doc, etc.)

#### Release a new version

> Note: You should write the CHANGELOG.md doc before releasing the version. 
This way, it'll be included in the same commit as the built files and version update

Then, release a new version:

- `yarn run release`

This command will prompt you for the version to update to, create a git tag, build the files and commit/push everything automatically.

> Don't forget we are using SemVer, please follow our SemVer rules.

**Pro hint**: use `beta` tag if you're in a work-in-progress (or unsure) to avoid releasing WIP versions that looks legit

### Code style

Code style is enforced by `.editorconfig` and files within the `.idea/` folder.
We also use EsLint, and extend AirBnb code style.

### Working on the project - IDE

WebStorm IDE is the preferred IDE for this project, as it is already configured with debug configurations, code style rules.
Only common configuration files (meant to be shared) have been tracked on git. (see [`.gitignore`](./.gitignore))
