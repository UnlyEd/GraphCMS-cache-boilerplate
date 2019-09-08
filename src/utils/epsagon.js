import epsagon from 'epsagon';

const token = process.env.EPSAGON_APP_TOKEN;

if (token) {
  epsagon.init({
    token,
    appName: process.env.EPSAGON_APP_NAME,
    metadataOnly: false, // Optional, send more trace data
  });
} else {
  process.env.DISABLE_EPSAGON = true;
}

export default epsagon;
