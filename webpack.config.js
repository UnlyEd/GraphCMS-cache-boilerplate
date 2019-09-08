const webpack = require('webpack');
const slsw = require('serverless-webpack');
const nodeExternals = require('webpack-node-externals');
const GitRevisionPlugin = require('git-revision-webpack-plugin'); // XXX https://www.npmjs.com/package/git-revision-webpack-plugin
const moment = require('moment');

const gitRevisionPlugin = new GitRevisionPlugin();

module.exports = (async () => {
  const accountId = await slsw.lib.serverless.providers.aws.getAccountId();

  return {
    entry: slsw.lib.entries,
    target: 'node',
    devtool: 'source-map',
    externals: [nodeExternals()],
    mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
    performance: {
      hints: false, // Turn off size warnings for entry points
    },
    stats: 'minimal', // https://github.com/serverless-heaven/serverless-webpack#stats
    plugins: [
      new webpack.DefinePlugin({
        'process.env.GIT_BRANCH': JSON.stringify(gitRevisionPlugin.branch()),
        'process.env.GIT_COMMIT_VERSION': JSON.stringify(gitRevisionPlugin.version()),
        'process.env.DEPLOY_TIME': JSON.stringify(moment().format('LLLL')),
        'process.env.AWS_ACCOUNT_ID': `${accountId}`,
      }),
    ],
    optimization: {
      nodeEnv: false, // Avoids overriding NODE_ENV - See https://github.com/webpack/webpack/issues/7470#issuecomment-394259698
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          use: ['babel-loader'],
          include: __dirname,
          exclude: /node_modules/,
        },
      ],
    },
  };
})();
