import { NextRequest, NextResponse } from 'next/server';
import { YouTube } from 'youtube-sr';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { Client, Storage, ID, Permission, Role } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

// Appwrite config
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'http://40.82.129.6/v1';
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '6a9979270031599e9842';
const apiKey = process.env.APPWRITE_API_KEY || '';
const bucketId = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID || 'music_files';

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

function getAppwriteClient() {
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);
  return client;
}

async function ensureBucketExists(storage: Storage) {
  try {
    await storage.getBucket(bucketId);
    return; // Bucket exists
  } catch {
    // Bucket doesn't exist — try to create it
  }

  try {
    await storage.createBucket({
      bucketId,
      name: 'Music Files',
      permissions: [
        Permission.read(Role.any()),
        Permission.write(Role.users()),
        Permission.create(Role.users()),
        Permission.delete(Role.users()),
        Permission.update(Role.users()),
      ],
      fileSecurity: false,
      enabled: true,
      maximumFileSize: 52428800, // 50MB
      allowedFileExtensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'],
      compression: 'none' as any,
      encryption: false,
      antivirus: false,
      transformations: false,
    });
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      return; // Another request created it concurrently
    }
    throw new Error(
      `Failed to create storage bucket "${bucketId}". ` +
      `Make sure APPWRITE_API_KEY is set with buckets.read and buckets.write scopes. ` +
      `Original error: ${e.message}`
    );
  }
}

async function downloadAudio(videoId: string): Promise<string> {
  const tmpDir = os.tmpdir();
  const outputPath = path.join(tmpDir, `freebuff_${videoId}_${Date.now()}.mp3`);
  const fullUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    await execFileAsync('python', [
      '-m', 'yt_dlp',
      '-x',                          // Extract audio
      '--audio-format', 'mp3',       // Convert to MP3
      '--audio-quality', '192K',     // Audio quality
      '-o', outputPath,              // Output path
      '--no-playlist',               // Don't download playlist
      '--no-warnings',
      '--no-check-certificates',
      fullUrl,
    ], { timeout: 120000 }); // 2 minute timeout
  } catch (e: any) {
    // yt-dlp might add an extension, check if file exists with .mp3 appended
    const mp3Path = `${outputPath}.mp3`;
    if (fs.existsSync(mp3Path)) {
      return mp3Path;
    }
    throw new Error(e.stderr || e.message || 'Failed to download audio');
  }

  if (!fs.existsSync(outputPath)) {
    // Try with .mp3 extension
    const mp3Path = `${outputPath}.mp3`;
    if (fs.existsSync(mp3Path)) {
      return mp3Path;
    }
    throw new Error('Downloaded file not found');
  }

  return outputPath;
}

async function uploadToAppwrite(filePath: string, title: string): Promise<string> {
  const storage = new Storage(getAppwriteClient());
  await ensureBucketExists(storage);

  const fileId = ID.unique();
  const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${fileId}.mp3`;

  const file = await storage.createFile({
    bucketId,
    fileId,
    file: InputFile.fromPath(filePath, fileName),
    permissions: [Permission.read(Role.any())],
  });

  // Construct the download URL
  const audioUrl = `${endpoint}/storage/buckets/${bucketId}/files/${file.$id}/view?project=${projectId}`;

  return audioUrl;
}

export async function POST(request: NextRequest) {
  let tmpFilePath: string | null = null;

  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // Step 1: Get video metadata
    const video = await YouTube.getVideo(`https://www.youtube.com/watch?v=${videoId}`);

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const title = video.title || 'Unknown';
    const artist = video.channel?.name || 'Unknown';
    const thumbnail = video.thumbnail?.url || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    const duration = video.duration || 0;
    const durationSeconds = Math.floor(duration / 1000);

    // Auto-extract lyrics from description
    let lyrics = '';
    try {
      const desc = video.description || '';
      const lyricsPatterns = [
        /(?:lyrics?|text|words)[:\s\n]+([\s\S]*?)(?:\n\n|$)/i,
        /\[\s*lyrics?\s*\]([\s\S]*?)\[\s*\/lyrics?\s*\]/i,
      ];
      for (const pattern of lyricsPatterns) {
        const match = desc.match(pattern);
        if (match && match[1].trim().length > 20) {
          lyrics = match[1].trim();
          break;
        }
      }
    } catch (_) {}

    // Step 2: Download audio as MP3
    tmpFilePath = await downloadAudio(videoId);

    // Step 3: Upload to Appwrite Storage
    const audioUrl = await uploadToAppwrite(tmpFilePath, title);

    // Step 4: Clean up temp file
    try {
      if (tmpFilePath && fs.existsSync(tmpFilePath)) {
        fs.unlinkSync(tmpFilePath);
      }
    } catch (_) {}

    return NextResponse.json({
      title,
      artist,
      thumbnail,
      duration: durationSeconds,
      videoId,
      originalUrl: url,
      audioUrl,
      lyrics,
    });
  } catch (error: any) {
    console.error('YouTube extraction error:', error);

    // Clean up temp file on error
    try {
      if (tmpFilePath && fs.existsSync(tmpFilePath)) {
        fs.unlinkSync(tmpFilePath);
      }
    } catch (_) {}

    return NextResponse.json(
      { error: error.message || 'Failed to extract and upload audio' },
      { status: 500 }
    );
  }
}
