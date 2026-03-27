const https = require('https');
https.get('https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js', (res) => {
  console.log(res.statusCode);
});
