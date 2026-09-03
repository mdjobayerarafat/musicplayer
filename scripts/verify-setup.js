const { Client, Databases } = require('node-appwrite');

const client = new Client()
  .setEndpoint('http://40.82.129.6/v1')
  .setProject('6a9979270031599e9842')
  .setKey('standard_5e00dd78c00ad92e821be4104cd1d894766a0e6cf49558cb092138cd51b9de1212de84f8285866b6d2671d8bcf3183682f6e81a44b0e0920a493493f19c58a88160ef9279844fd5c82269d7b5284a127252033a604a7a9492c3606a31d4345ea4808c3e3fd3c0253e4b60e3069c5995a8df4c0ec4a4db909e46d96a148d69977');

const db = new Databases(client);

async function check() {
  const cols = await db.listCollections('music_db');
  console.log('=== Collections ===');
  cols.collections.forEach(c => console.log(c['$id'], '-', c.name));

  console.log('\n=== Songs attrs ===');
  const sattrs = await db.listAttributes('music_db', 'songs');
  sattrs.attributes.forEach(a => console.log('  ', a.key, '-', a.size || a.type, '-', a.status));

  console.log('\n=== Albums attrs ===');
  const aattrs = await db.listAttributes('music_db', 'albums');
  aattrs.attributes.forEach(a => console.log('  ', a.key, '-', a.size || a.type, '-', a.status));

  console.log('\n=== Playlists attrs ===');
  const pattrs = await db.listAttributes('music_db', 'playlists');
  pattrs.attributes.forEach(a => console.log('  ', a.key, '-', a.size || a.type, '-', a.status));

  console.log('\n=== Playlist Songs attrs ===');
  const psattrs = await db.listAttributes('music_db', 'playlist_songs');
  psattrs.attributes.forEach(a => console.log('  ', a.key, '-', a.size || a.type, '-', a.status));
}

check().catch(e => console.error(e.message));
