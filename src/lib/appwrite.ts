import { Client, Account, Databases, Storage, Functions } from 'appwrite';

const client = new Client();

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'http://40.82.129.6/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '6a9979270031599e9842');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'music_db';
export const SONGS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_SONGS_COLLECTION_ID || 'songs';
export const ALBUMS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_ALBUMS_COLLECTION_ID || 'albums';
export const STORAGE_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID || 'music_files';
export const PLAYLISTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_PLAYLISTS_COLLECTION_ID || 'playlists';
export const PLAYLIST_SONGS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_PLAYLIST_SONGS_COLLECTION_ID || 'playlist_songs';

export default client;
