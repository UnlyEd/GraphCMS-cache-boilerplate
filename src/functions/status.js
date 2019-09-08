import moment from 'moment';

export const status = async (event, context) => {
  return {
    body: JSON.stringify({
      status: 'OK',
      processNodeEnv: process.env.NODE_ENV,
      time: moment().toISOString(),
      appName: process.env.APP_NAME,
      release: process.env.GIT_COMMIT_VERSION,
      branch: process.env.GIT_BRANCH,
      releasedAt: process.env.DEPLOY_TIME,
      nodejs: process.version,
    }),
  };
};
