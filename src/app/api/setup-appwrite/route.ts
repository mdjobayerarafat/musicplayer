import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Storage, ID, Permission, Role } from 'node-appwrite';

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'http://40.82.129.6/v1';
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '6a9979270031599e9842';
const apiKey = process.env.APPWRITE_API_KEY || '';
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'music_db';
const songsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_SONGS_COLLECTION_ID || 'songs';
const albumsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ALBUMS_COLLECTION_ID || 'albums';
const storageBucketId = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID || 'music_files';

export async function POST(request: NextRequest) {
  try {
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new Databases(client);

    // Create database
    try {
      await databases.create(databaseId, 'Music Database');
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        throw e;
      }
    }

    // Create Songs collection
    try {
      await databases.createCollection(
        databaseId,
        songsCollectionId,
        'Songs',
        [
          Permission.read(Role.any()),
          Permission.write(Role.users()),
          Permission.create(Role.users()),
          Permission.delete(Role.users()),
          Permission.update(Role.users()),
        ]
      );
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        throw e;
      }
    }

    // Songs collection attributes
    const songAttributes = [
      { key: 'title', type: 'string', size: 255, required: true },
      { key: 'artist', type: 'string', size: 255, required: true },
      { key: 'albumId', type: 'string', size: 255, required: false },
      { key: 'coverImage', type: 'string', size: 2048, required: false },
      { key: 'audioUrl', type: 'string', size: 10000, required: true },
      { key: 'youtubeUrl', type: 'string', size: 500, required: false },
      { key: 'youtubeVideoId', type: 'string', size: 50, required: false },
      { key: 'duration', type: 'integer', required: false },
      { key: 'createdAt', type: 'datetime', required: false },
    ];

    for (const attr of songAttributes) {
      try {
        if (attr.type === 'string') {
          await databases.createStringAttribute(
            databaseId,
            songsCollectionId,
            attr.key,
            attr.size || 255,
            attr.required || false
          );
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(
            databaseId,
            songsCollectionId,
            attr.key,
            attr.required || false
          );
        } else if (attr.type === 'datetime') {
          await databases.createDatetimeAttribute(
            databaseId,
            songsCollectionId,
            attr.key,
            attr.required || false
          );
        }
      } catch (e: any) {
        if (!e.message?.includes('already exists')) {
          console.error(`Error creating attribute ${attr.key}:`, e.message);
        }
      }
    }

    // Create Albums collection
    try {
      await databases.createCollection(
        databaseId,
        albumsCollectionId,
        'Albums',
        [
          Permission.read(Role.any()),
          Permission.write(Role.users()),
          Permission.create(Role.users()),
          Permission.delete(Role.users()),
          Permission.update(Role.users()),
        ]
      );
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        throw e;
      }
    }

    // Albums collection attributes
    const albumAttributes = [
      { key: 'title', type: 'string', size: 255, required: true },
      { key: 'artist', type: 'string', size: 255, required: true },
      { key: 'coverImage', type: 'string', size: 2048, required: false },
      { key: 'songCount', type: 'integer', required: false },
      { key: 'createdAt', type: 'datetime', required: false },
    ];

    for (const attr of albumAttributes) {
      try {
        if (attr.type === 'string') {
          await databases.createStringAttribute(
            databaseId,
            albumsCollectionId,
            attr.key,
            attr.size || 255,
            attr.required || false
          );
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(
            databaseId,
            albumsCollectionId,
            attr.key,
            attr.required || false
          );
        } else if (attr.type === 'datetime') {
          await databases.createDatetimeAttribute(
            databaseId,
            albumsCollectionId,
            attr.key,
            attr.required || false
          );
        }
      } catch (e: any) {
        if (!e.message?.includes('already exists')) {
          console.error(`Error creating attribute ${attr.key}:`, e.message);
        }
      }
    }

    // ── Create Storage Bucket ──
    const storage = new Storage(client);

    try {
      await storage.getBucket(storageBucketId);
    } catch {
      try {
        await storage.createBucket({
          bucketId: storageBucketId,
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
        if (!e.message?.includes('already exists')) {
          console.error('Error creating storage bucket:', e.message);
          throw new Error(
            `Failed to create storage bucket "${storageBucketId}". ` +
            `Make sure your APPWRITE_API_KEY has buckets.read and buckets.write scopes. ` +
            `You can also create it manually in the Appwrite Console > Storage. ` +
            `Error: ${e.message}`
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Appwrite setup complete',
      databaseId,
      songsCollectionId,
      albumsCollectionId,
      bucketId: storageBucketId,
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: error.message || 'Setup failed' }, { status: 500 });
  }
}
