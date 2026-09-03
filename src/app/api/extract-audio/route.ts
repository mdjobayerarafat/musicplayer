import { NextRequest, NextResponse } from 'next/server';
import { YouTube } from 'youtube-sr';

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // Get video metadata using youtube-sr
    const video = await YouTube.getVideo(`https://www.youtube.com/watch?v=${videoId}`);
    
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const title = video.title || 'Unknown';
    const artist = video.channel?.name || 'Unknown';
    const thumbnail = video.thumbnail?.url || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    const duration = video.duration || 0; // in ms
    const durationSeconds = Math.floor(duration / 1000);

    return NextResponse.json({
      title,
      artist,
      thumbnail,
      duration: durationSeconds,
      videoId,
      originalUrl: url,
    });
  } catch (error: any) {
    console.error('YouTube extraction error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract video info' },
      { status: 500 }
    );
  }
}
