const { Innertube } = require('youtubei.js');

async function test() {
  try {
    const yt = await Innertube.create();
    const info = await yt.getInfo('dQw4w9WgXcQ');

    const sd = info.streaming_data;
    console.log('HLS manifest:', sd.hls_manifest_url ? 'YES' : 'NO');
    console.log('DASH manifest:', sd.dash_manifest_url ? 'YES' : 'NO');
    console.log('Server ABR:', sd.server_abr_streaming_url ? 'YES' : 'NO');

    if (sd.hls_manifest_url) {
      console.log('\nHLS URL (first 150 chars):');
      console.log(sd.hls_manifest_url.substring(0, 150) + '...');

      // Test if it's accessible
      const resp = await fetch(sd.hls_manifest_url);
      console.log('\nHLS fetch status:', resp.status);
      console.log('Content-Type:', resp.headers.get('content-type'));
      if (resp.status === 200) {
        const text = await resp.text();
        console.log('HLS content length:', text.length);
        // Check for audio streams
        const audioStreams = text.match(/BANDWIDTH=\d+/g);
        console.log('Stream variants found:', audioStreams?.length || 0);
      }
    }

    if (sd.server_abr_streaming_url) {
      console.log('\nServer ABR URL:');
      console.log(sd.server_abr_streaming_url.substring(0, 150));
      const resp2 = await fetch(sd.server_abr_streaming_url);
      console.log('Server ABR fetch status:', resp2.status);
    }
  } catch (e) {
    console.error('ERROR:', e.message);
  }
}

test();
