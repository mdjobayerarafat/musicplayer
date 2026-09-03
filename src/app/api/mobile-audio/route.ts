import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const dynamic = 'force-dynamic';

// Find yt-dlp binary
function getYtDlpPath(): string {
  // Windows common paths
  return 'python';
}

async function getAudioUrl(videoId: string): Promise<{ url: string; title: string; duration: number }> {
  const fullUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Get the direct audio stream URL
  const { stdout: urlOut } = await execFileAsync('python', [
    '-m', 'yt_dlp',
    '-f', 'bestaudio',
    '--get-url',
    '--no-warnings',
    fullUrl,
  ], { timeout: 30000 });

  const audioUrl = urlOut.trim();
  if (!audioUrl || !audioUrl.startsWith('http')) {
    throw new Error('Failed to get audio URL');
  }

  // Get title and duration
  let title = 'Unknown';
  let duration = 0;
  try {
    const { stdout: jsonOut } = await execFileAsync('python', [
      '-m', 'yt_dlp',
      '--dump-json',
      '--no-download',
      '--no-warnings',
      fullUrl,
    ], { timeout: 30000 });
    const info = JSON.parse(jsonOut);
    title = info.title || 'Unknown';
    duration = Math.floor(info.duration || 0);
  } catch (_) {
    // URL extraction succeeded, just metadata failed — continue
  }

  return { url: audioUrl, title, duration };
}

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json();

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    const result = await getAudioUrl(videoId);

    return NextResponse.json({
      audioUrl: result.url,
      title: result.title,
      duration: result.duration,
    });
  } catch (error: any) {
    console.error('Mobile audio error:', error?.message);
    return NextResponse.json(
      { error: error?.message || 'Failed to resolve audio' },
      { status: 500 }
    );
  }
}
