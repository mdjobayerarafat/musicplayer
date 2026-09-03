import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Storage, ID, Permission, Role } from 'node-appwrite';

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'http://40.82.129.6/v1';
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '6a9979270031599e9842';
const apiKey = process.env.APPWRITE_API_KEY || '';
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'music_db';
const songsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_SONGS_COLLECTION_ID || 'songs';
const albumsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ALBUMS_COLLECTION_ID || 'albums';
const playlistsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_PLAYLISTS_COLLECTION_ID || 'playlists';
const playlistSongsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_PLAYLIST_SONGS_COLLECTION_ID || 'playlist_songs';
const storageBucketId = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID || 'music_files';
const imageStorageBucketId = process.env.NEXT_PUBLIC_APPWRITE_IMAGE_STORAGE_BUCKET_ID || 'cover_images';

async function createCollectionIfNotExists(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  name: string,
  attributes: Array<{ key: string; type: string; size?: number; required?: boolean }>
) {
  try {
    await databases.createCollection(
      databaseId,
      collectionId,
      name,
      [
        Permission.read(Role.any()),
        Permission.write(Role.users()),
        Permission.create(Role.users()),
        Permission.delete(Role.users()),
        Permission.update(Role.users()),
      ]
    );
  } catch (e: any) {
    if (!e.message?.includes('already exists')) throw e;
  }

  for (const attr of attributes) {
    try {
      if (attr.type === 'string') {
        await databases.createStringAttribute(
          databaseId, collectionId, attr.key, attr.size || 255, attr.required || false
        );
      } else if (attr.type === 'integer') {
        await databases.createIntegerAttribute(
          databaseId, collectionId, attr.key, attr.required || false
        );
      } else if (attr.type === 'datetime') {
        await databases.createDatetimeAttribute(
          databaseId, collectionId, attr.key, attr.required || false
        );
      } else if (attr.type === 'boolean') {
        await databases.createBooleanAttribute(
          databaseId, collectionId, attr.key, attr.required || false
        );
      }
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        console.error(`Error creating attribute ${attr.key}:`, e.message);
      }
    }
  }
}

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
      if (!e.message?.includes('already exists')) throw e;
    }

    // Songs collection
    await createCollectionIfNotExists(databases, databaseId, songsCollectionId, 'Songs', [
      { key: 'title', type: 'string', size: 255, required: true },
      { key: 'artist', type: 'string', size: 255, required: true },
      { key: 'albumId', type: 'string', size: 255, required: false },
      { key: 'coverImage', type: 'string', size: 2048, required: false },
      { key: 'audioUrl', type: 'string', size: 10000, required: true },
      { key: 'youtubeUrl', type: 'string', size: 500, required: false },
      { key: 'youtubeVideoId', type: 'string', size: 50, required: false },
      { key: 'duration', type: 'integer', required: false },
      { key: 'createdAt', type: 'datetime', required: false },
      { key: 'lyrics', type: 'string', size: 50000, required: false },
      { key: 'songOrder', type: 'integer', required: false },
    ]);

    // Albums collection
    await createCollectionIfNotExists(databases, databaseId, albumsCollectionId, 'Albums', [
      { key: 'title', type: 'string', size: 255, required: true },
      { key: 'artist', type: 'string', size: 255, required: true },
      { key: 'coverImage', type: 'string', size: 2048, required: false },
      { key: 'songCount', type: 'integer', required: false },
      { key: 'createdAt', type: 'datetime', required: false },
    ]);

    // Playlists collection
    await createCollectionIfNotExists(databases, databaseId, playlistsCollectionId, 'Playlists', [
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'description', type: 'string', size: 1000, required: false },
      { key: 'coverImage', type: 'string', size: 2048, required: false },
      { key: 'userId', type: 'string', size: 255, required: true },
      { key: 'songIds', type: 'string', size: 10000, required: false },
      { key: 'createdAt', type: 'datetime', required: false },
    ]);

    // Playlist Songs collection (for detailed playlist song entries)
    await createCollectionIfNotExists(databases, databaseId, playlistSongsCollectionId, 'Playlist Songs', [
      { key: 'playlistId', type: 'string', size: 255, required: true },
      { key: 'songId', type: 'string', size: 255, required: true },
      { key: 'addedAt', type: 'datetime', required: false },
      { key: 'position', type: 'integer', required: false },
    ]);

    // Storage Bucket for Music Files
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
          maximumFileSize: 52428800,
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
            `Error: ${e.message}`
          );
        }
      }
    }

    // Storage Bucket for Cover Images
    try {
      await storage.getBucket(imageStorageBucketId);
    } catch {
      try {
        await storage.createBucket({
          bucketId: imageStorageBucketId,
          name: 'Cover Images',
          permissions: [
            Permission.read(Role.any()),
            Permission.write(Role.users()),
            Permission.create(Role.users()),
            Permission.delete(Role.users()),
            Permission.update(Role.users()),
          ],
          fileSecurity: false,
          enabled: true,
          maximumFileSize: 10485760, // 10MB
          allowedFileExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          compression: 'none' as any,
          encryption: false,
          antivirus: false,
          transformations: true,
        });
      } catch (e: any) {
        if (!e.message?.includes('already exists')) {
          console.error('Error creating image storage bucket:', e.message);
          throw new Error(
            `Failed to create image storage bucket "${imageStorageBucketId}". ` +
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
      playlistsCollectionId,
      bucketId: storageBucketId,
      imageBucketId: imageStorageBucketId,
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: error.message || 'Setup failed' }, { status: 500 });
  }
}
