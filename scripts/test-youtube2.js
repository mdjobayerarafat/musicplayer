const { Innertube } = require('youtubei.js');

async function test() {
  try {
    const yt = await Innertube.create();
    const info = await yt.getInfo('dQw4w9WgXcQ');
    
    console.log('Title:', info.basic_info.title);
    console.log('Duration:', info.basic_info.duration);
    
    // Try streaming_data
    const sd = info.streaming_data;
    console.log('\nStreaming data keys:', Object.keys(sd || {}));
    console.log('Formats count:', sd?.formats?.length || 0);
    console.log('Adaptive formats count:', sd?.adaptive_formats?.length || 0);
    
    // Get audio formats from adaptive
    const audioFormats = (sd?.adaptive_formats || []).filter(f => f.mime_type?.includes('audio'));
    console.log('\nAudio adaptive formats:', audioFormats.length);
    
    if (audioFormats.length > 0) {
      const best = audioFormats[0];
      console.log('Best audio:', best.mime_type, best.bitrate);
      console.log('URL type:', typeof best.url);
      console.log('URL exists:', !!best.url);
      if (best.url) {
        console.log('\nDirect URL found! (first 120 chars):');
        console.log(String(best.url).substring(0, 120) + '...');
        
        // Test download
        const response = await fetch(String(best.url), { headers: { Range: 'bytes=0-1023' } });
        console.log('\nHTTP Status:', response.status);
        console.log('Content-Type:', response.headers.get('content-type'));
        console.log('Content-Length:', response.headers.get('content-length'));
        console.log('\n✅ Audio URL works!');
      } else {
        console.log('No direct URL, signatureCipher present:', !!best.signature_cipher);
      }
    }
  } catch (e) {
    console.error('ERROR:', e.message);
  }
}

test();
