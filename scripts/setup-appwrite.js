const { Client, Databases, ID, Permission, Role } = require('node-appwrite');

// Configuration from .env.local
const ENDPOINT = 'http://40.82.129.6/v1';
const PROJECT_ID = '6a9979270031599e9842';
const API_KEY = 'standard_5e00dd78c00ad92e821be4104cd1d894766a0e6cf49558cb092138cd51b9de1212de84f8285866b6d2671d8bcf3183682f6e81a44b0e0920a493493f19c58a88160ef9279844fd5c82269d7b5284a127252033a604a7a9492c3606a31d4345ea4808c3e3fd3c0253e4b60e3069c5995a8df4c0ec4a4db909e46d96a148d69977';
const DATABASE_ID = 'music_db';
const SONGS_COLLECTION_ID = 'songs';
const ALBUMS_COLLECTION_ID = 'albums';
const PLAYLISTS_COLLECTION_ID = 'playlists';
const PLAYLIST_SONGS_COLLECTION_ID = 'playlist_songs';

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

async function createDatabase() {
  console.log('📦 Creating database...');
  try {
    const db = await databases.create(DATABASE_ID, 'Music Database');
    console.log('✅ Database created:', db.$id);
  } catch (e) {
    if (e.code === 409 || e.message?.includes('already exists')) {
      console.log('ℹ️  Database already exists, skipping...');
    } else {
      throw e;
    }
  }
}

async function createCollection(id, name, permissions) {
  console.log(`📁 Creating collection: ${name}...`);
  try {
    const col = await databases.createCollection(DATABASE_ID, id, name, permissions);
    console.log(`✅ Collection created: ${col.$id}`);
  } catch (e) {
    if (e.code === 409 || e.message?.includes('already exists')) {
      console.log(`ℹ️  Collection ${name} already exists, skipping...`);
    } else {
      throw e;
    }
  }
}

async function createStringAttr(collectionId, key, size, required = false, defaultValue = null) {
  try {
    await databases.createStringAttribute(DATABASE_ID, collectionId, key, size, required, defaultValue);
    console.log(`  ✅ String attr: ${key} (size: ${size}, required: ${required})`);
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log(`  ℹ️  Attr ${key} already exists`);
    } else {
      console.log(`  ⚠️  Error creating ${key}: ${e.message}`);
    }
  }
}

async function createIntAttr(collectionId, key, required = false, min = null, max = null) {
  try {
    await databases.createIntegerAttribute(DATABASE_ID, collectionId, key, required, min, max);
    console.log(`  ✅ Integer attr: ${key} (required: ${required})`);
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log(`  ℹ️  Attr ${key} already exists`);
    } else {
      console.log(`  ⚠️  Error creating ${key}: ${e.message}`);
    }
  }
}

async function createBooleanAttr(collectionId, key, required = false, defaultValue = false) {
  try {
    await databases.createBooleanAttribute(DATABASE_ID, collectionId, key, required, defaultValue);
    console.log(`  ✅ Boolean attr: ${key} (required: ${required})`);
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log(`  ℹ️  Attr ${key} already exists`);
    } else {
      console.log(`  ⚠️  Error creating ${key}: ${e.message}`);
    }
  }
}

async function createDatetimeAttr(collectionId, key, required = false) {
  try {
    await databases.createDatetimeAttribute(DATABASE_ID, collectionId, key, required);
    console.log(`  ✅ Datetime attr: ${key} (required: ${required})`);
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log(`  ℹ️  Attr ${key} already exists`);
    } else {
      console.log(`  ⚠️  Error creating ${key}: ${e.message}`);
    }
  }
}

const allPermissions = [
  Permission.read(Role.any()),
  Permission.write(Role.users()),
  Permission.create(Role.users()),
  Permission.delete(Role.users()),
  Permission.update(Role.users()),
];

async function setupSongsCollection() {
  console.log('\n🎵 Setting up SONGS collection...');
  await createCollection(SONGS_COLLECTION_ID, 'Songs', allPermissions);

  console.log('  Creating attributes...');
  await createStringAttr(SONGS_COLLECTION_ID, 'title', 255, true);
  await createStringAttr(SONGS_COLLECTION_ID, 'artist', 255, true);
  await createStringAttr(SONGS_COLLECTION_ID, 'albumId', 255, false, '');
  await createStringAttr(SONGS_COLLECTION_ID, 'coverImage', 2048, false, '');
  await createStringAttr(SONGS_COLLECTION_ID, 'audioUrl', 10000, true);
  await createStringAttr(SONGS_COLLECTION_ID, 'youtubeUrl', 500, false, '');
  await createStringAttr(SONGS_COLLECTION_ID, 'youtubeVideoId', 50, false, '');
  await createIntAttr(SONGS_COLLECTION_ID, 'duration', false, 0, 86400);
  await createBooleanAttr(SONGS_COLLECTION_ID, 'isAdmin', false, false);
  await createDatetimeAttr(SONGS_COLLECTION_ID, 'createdAt', false);
}

async function setupAlbumsCollection() {
  console.log('\n📀 Setting up ALBUMS collection...');
  await createCollection(ALBUMS_COLLECTION_ID, 'Albums', allPermissions);

  console.log('  Creating attributes...');
  await createStringAttr(ALBUMS_COLLECTION_ID, 'title', 255, true);
  await createStringAttr(ALBUMS_COLLECTION_ID, 'artist', 255, true);
  await createStringAttr(ALBUMS_COLLECTION_ID, 'coverImage', 2048, false, '');
  await createIntAttr(ALBUMS_COLLECTION_ID, 'songCount', false, 0, 99999);
  await createDatetimeAttr(ALBUMS_COLLECTION_ID, 'createdAt', false);
}

async function setupPlaylistsCollection() {
  console.log('\n🎶 Setting up PLAYLISTS collection...');
  await createCollection(PLAYLISTS_COLLECTION_ID, 'Playlists', allPermissions);

  console.log('  Creating attributes...');
  await createStringAttr(PLAYLISTS_COLLECTION_ID, 'name', 255, true);
  await createStringAttr(PLAYLISTS_COLLECTION_ID, 'description', 1000, false, '');
  await createStringAttr(PLAYLISTS_COLLECTION_ID, 'userId', 255, true);
  await createStringAttr(PLAYLISTS_COLLECTION_ID, 'coverImage', 2048, false, '');
  await createIntAttr(PLAYLISTS_COLLECTION_ID, 'songCount', false, 0, 99999);
  await createBooleanAttr(PLAYLISTS_COLLECTION_ID, 'isPublic', false, false);
  await createDatetimeAttr(PLAYLISTS_COLLECTION_ID, 'createdAt', false);
}

async function setupPlaylistSongsCollection() {
  console.log('\n🎶 Setting up PLAYLIST_SONGS collection...');
  await createCollection(PLAYLIST_SONGS_COLLECTION_ID, 'Playlist Songs', allPermissions);

  console.log('  Creating attributes...');
  await createStringAttr(PLAYLIST_SONGS_COLLECTION_ID, 'playlistId', 255, true);
  await createStringAttr(PLAYLIST_SONGS_COLLECTION_ID, 'songId', 255, true);
  await createIntAttr(PLAYLIST_SONGS_COLLECTION_ID, 'position', false, 0, 99999);
  await createDatetimeAttr(PLAYLIST_SONGS_COLLECTION_ID, 'addedAt', false);
}

async function main() {
  console.log('🚀 Starting Appwrite setup...\n');
  console.log(`   Endpoint: ${ENDPOINT}`);
  console.log(`   Project:  ${PROJECT_ID}`);
  console.log(`   Database: ${DATABASE_ID}\n`);

  try {
    await createDatabase();

    // Wait a moment for database to be ready
    await new Promise(r => setTimeout(r, 1000));

    await setupSongsCollection();
    await setupAlbumsCollection();
    await setupPlaylistsCollection();
    await setupPlaylistSongsCollection();

    console.log('\n🎉 Setup complete!');
    console.log('\n📋 Summary:');
    console.log(`   Database ID:        ${DATABASE_ID}`);
    console.log(`   Songs Collection:   ${SONGS_COLLECTION_ID}`);
    console.log(`   Albums Collection:  ${ALBUMS_COLLECTION_ID}`);
    console.log(`   Playlists:          ${PLAYLISTS_COLLECTION_ID}`);
    console.log(`   Playlist Songs:     ${PLAYLIST_SONGS_COLLECTION_ID}`);
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    if (error.code) console.error('   Error code:', error.code);
    if (error.response) console.error('   Response:', JSON.stringify(error.response, null, 2));
    process.exit(1);
  }
}

main();
