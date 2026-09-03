const { Innertube } = require('youtubei.js');

async function test() {
  try {
    const yt = await Innertube.create();
    const info = await yt.getInfo('dQw4w9WgXcQ');
    
    console.log('Title:', info.basic_info.title);
    console.log('Duration:', info.basic_info.duration);
    console.log('Channel:', info.basic_info.channel?.name);
    
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });
    console.log('\nAudio format found!');
    console.log('Mime:', format.mime_type);
    console.log('Bitrate:', format.average_bitrate);
    
    // Get the streaming URL
    const url = format.decipher(yt.session.player);
    console.log('\nStreaming URL (first 120 chars):');
    console.log(url.substring(0, 120) + '...');
    
    // Test downloading a small chunk
    const response = await fetch(url, { headers: { Range: 'bytes=0-1023' } });
    console.log('\nHTTP Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('Content-Length:', response.headers.get('content-length'));
    
    console.log('\n✅ Audio extraction works!');
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error('Stack:', e.stack?.split('\n').slice(0, 5).join('\n'));
  }
}

test();
