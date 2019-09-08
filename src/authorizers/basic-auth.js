import { createLogger } from '@unly/utils-simple-logger';

import epsagon from '../utils/epsagon';

const logger = createLogger({
  label: 'Basic Auth',
});

const UNAUTHORIZED_HTTP_RESPONSE = 'Unauthorized'; // Returns special HTTP string that's expected by the browser, must not be used to display an error message. Will force re-prompt credentials dialog box to the end-user.

if (!process.env.BASIC_AUTH_USERNAME || !process.env.BASIC_AUTH_PASSWORD) {
  throw Error(`No "BASIC_AUTH_USERNAME" or "BASIC_AUTH_PASSWORD" defined as environment variable, please make sure you've defined both in the .env.${process.env.NODE_ENV} file.`);
}

// See https://medium.com/@Da_vidgf/http-basic-auth-with-api-gateway-and-serverless-5ae14ad0a270
function buildAllowAllPolicy(event, principalId) {
  const tmp = event.methodArn.split(':');
  const apiGatewayArnTmp = tmp[5].split('/');
  const awsAccountId = tmp[4];
  const awsRegion = tmp[3];
  const restApiId = apiGatewayArnTmp[0];
  const stage = apiGatewayArnTmp[1];
  const apiArn = `arn:aws:execute-api:${awsRegion}:${awsAccountId}:${
    restApiId}/${stage}/*/*`;

  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: [apiArn],
        },
      ],
    },
  };
}

exports.handler = function handler(event, context, callback) {
  if (process.env.NODE_ENV === 'development') {
    // XXX In dev env, we don't want to be bothered with basic-auth (which isn't handled properly and display 401, because there is no API GW on our local machine)
    return callback(null, buildAllowAllPolicy(event, 'bypass-security')); // Send any non-empty username bypasses the policy, and force the authorizer to allow
  }

  const authorizationHeader = event.headers.Authorization;

  if (!authorizationHeader) {
    const error = `[Basic-Auth] Authentication failure - No credentials provided`;
    epsagon.setError(Error(error));
    logger.error(error);

    return callback(UNAUTHORIZED_HTTP_RESPONSE);
  }

  const encodedCreds = authorizationHeader.split(' ')[1];
  const plainCreds = (new Buffer(encodedCreds, 'base64')).toString().split(':');// eslint-disable-line no-buffer-constructor
  const username = plainCreds[0];
  const password = plainCreds[1];

  if (!(username === process.env.BASIC_AUTH_USERNAME && password === process.env.BASIC_AUTH_PASSWORD)) {
    const error = `[Basic-Auth] Authentication failure - Wrong credentials provided (username: "${username}" | password: "${password}")`;
    epsagon.setError(Error(error));
    logger.error(error);

    return callback(UNAUTHORIZED_HTTP_RESPONSE);
  }

  return callback(null, buildAllowAllPolicy(event, username));
};
