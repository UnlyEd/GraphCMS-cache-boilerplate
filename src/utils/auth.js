import { createLogger } from '@unly/utils-simple-logger';
import get from 'lodash.get';
import epsagon from './epsagon';

const logger = createLogger({
  label: 'Authentication utils',
});

export const gcmsWebhookTokenKey = 'GraphCMS-WebhookToken';
export const noTokenProvidedMessage = `Authentication failed`;

/**
 * Attempts to authenticate using a token in the headers
 *
 * @param headers
 * @return {boolean}
 */
export const headerAuthentication = (headers) => {
  logger.debug('Validating authentication credentials...');
  const GCMSWebhookToken = get(headers, gcmsWebhookTokenKey, get(headers, gcmsWebhookTokenKey.toLowerCase(), null));

  // Check first if a correct token was provided - Security to avoid unauthenticated callers to DDoS GCMS API by spawning a refresh loop
  if (GCMSWebhookToken !== process.env.REFRESH_CACHE_TOKEN) {
    const errorMessage = `Attempt to refresh cache with wrong token: "${GCMSWebhookToken}" (access refused)`;
    epsagon.setError(Error(errorMessage));
    logger.error(errorMessage);

    return false;
  }

  logger.debug('Authentication successful.');
  return true;
};
