import epsagon from '../utils/epsagon';
import { cacheQuery as cacheQueryHandler } from './cache-query';
import { readCache as readCacheHandler } from './read-cache';
import { resetCache as resetCacheHandler } from './reset-cache';

export const readCache = epsagon.lambdaWrapper(readCacheHandler);
export const cacheQuery = epsagon.lambdaWrapper(cacheQueryHandler);
// export const refreshCache = epsagon.lambdaWrapper(refreshCacheHandler); // XXX Not compatible, creates an infinite loop for some reason
export const resetCache = epsagon.lambdaWrapper(resetCacheHandler);
