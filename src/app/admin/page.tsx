'use client';

import { useState, useEffect } from 'react';
import { databases, DATABASE_ID, SONGS_COLLECTION_ID, ALBUMS_COLLECTION_ID } from '@/lib/appwrite';
import { ID } from 'appwrite';
import { Song, Album } from '@/lib/types';
import toast from 'react-hot-toast';
import {
  FaYoutube,
  FaMusic,
  FaTrash,
  FaSync,
  FaPlus,
  FaSpinner,
} from 'react-icons/fa';

export default function AdminPage() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [newAlbum, setNewAlbum] = useState({ title: '', artist: '', coverImage: '' });
  const [showAddAlbum, setShowAddAlbum] = useState(false);
  const [activeTab, setActiveTab] = useState<'add' | 'manage'>('add');
  const [setupLoading, setSetupLoading] = useState(false);

  useEffect(() => {
    loadSongs();
    loadAlbums();
  }, []);

  const loadSongs = async () => {
    try {
      const response = await databases.listDocuments(DATABASE_ID, SONGS_COLLECTION_ID);
      setSongs(response.documents as unknown as Song[]);
    } catch (error: any) {
      console.error('Failed to load songs:', error);
    }
  };

  const loadAlbums = async () => {
    try {
      const response = await databases.listDocuments(DATABASE_ID, ALBUMS_COLLECTION_ID);
      setAlbums(response.documents as unknown as Album[]);
    } catch (error: any) {
      console.error('Failed to load albums:', error);
    }
  };

  const setupAppwrite = async () => {
    setSetupLoading(true);
    try {
      const response = await fetch('/api/setup-appwrite', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        toast.success('Appwrite setup complete!');
        loadSongs();
        loadAlbums();
      } else {
        toast.error(data.error || 'Setup failed');
      }
    } catch (error: any) {
      toast.error('Setup failed: ' + error.message);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleExtractAndAdd = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    try {
      toast.loading('Fetching video info...', { id: 'extract' });

      const response = await fetch('/api/extract-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract video info');
      }

      toast.loading('Saving to database...', { id: 'extract' });

      await databases.createDocument(
        DATABASE_ID,
        SONGS_COLLECTION_ID,
        ID.unique(),
        {
          title: data.title,
          artist: data.artist,
          albumId: '',
          coverImage: data.thumbnail,
          audioUrl: '',
          youtubeUrl: data.originalUrl,
          youtubeVideoId: data.videoId,
          duration: data.duration,
          createdAt: new Date().toISOString(),
        }
      );

      toast.success(`Added "${data.title}"!`, { id: 'extract' });
      setYoutubeUrl('');
      loadSongs();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add song', { id: 'extract' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddManualSong = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const title = formData.get('title') as string;
    const artist = formData.get('artist') as string;
    const audioUrl = formData.get('audioUrl') as string;
    const coverImage = formData.get('coverImage') as string || '';
    const albumId = formData.get('albumId') as string || '';

    if (!title || !artist || !audioUrl) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await databases.createDocument(
        DATABASE_ID,
        SONGS_COLLECTION_ID,
        ID.unique(),
        {
          title,
          artist,
          albumId,
          coverImage,
          audioUrl,
          youtubeUrl: '',
          youtubeVideoId: '',
          duration: 0,
          createdAt: new Date().toISOString(),
        }
      );

      toast.success('Song added successfully!');
      form.reset();
      loadSongs();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add song');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbum.title || !newAlbum.artist) {
      toast.error('Please fill in album title and artist');
      return;
    }

    setLoading(true);
    try {
      await databases.createDocument(
        DATABASE_ID,
        ALBUMS_COLLECTION_ID,
        ID.unique(),
        {
          title: newAlbum.title,
          artist: newAlbum.artist,
          coverImage: newAlbum.coverImage,
          songCount: 0,
          createdAt: new Date().toISOString(),
        }
      );

      toast.success('Album created!');
      setNewAlbum({ title: '', artist: '', coverImage: '' });
      setShowAddAlbum(false);
      loadAlbums();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add album');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSong = async (songId: string) => {
    if (!confirm('Are you sure you want to delete this song?')) return;

    try {
      await databases.deleteDocument(DATABASE_ID, SONGS_COLLECTION_ID, songId);
      toast.success('Song deleted');
      loadSongs();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete song');
    }
  };

  return (
    <div className="p-4 sm:p-6 pt-20 lg:pt-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-gray-400 mt-1">Manage your music library</p>
        </div>
        <button
          onClick={setupAppwrite}
          disabled={setupLoading}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-800 rounded-xl transition-all text-sm font-medium"
        >
          {setupLoading ? <FaSpinner className="animate-spin" /> : <FaSync />}
          Setup Database
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('add')}
          className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'add' ? 'bg-rose-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
          }`}
        >
          <FaPlus className="inline mr-2" />
          Add Music
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'manage' ? 'bg-rose-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
          }`}
        >
          <FaMusic className="inline mr-2" />
          Manage ({songs.length})
        </button>
      </div>

      {activeTab === 'add' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* YouTube Import */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
                <FaYoutube className="text-red-500 text-xl" />
              </div>
              <div>
                <h3 className="font-semibold">Import from YouTube</h3>
                <p className="text-sm text-gray-400">Paste a YouTube URL to add to library</p>
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-rose-500 text-white placeholder-gray-500"
                onKeyDown={(e) => e.key === 'Enter' && handleExtractAndAdd()}
              />
              <p className="text-xs text-gray-500">
                Music plays directly from YouTube — no download needed
              </p>
              <button
                onClick={handleExtractAndAdd}
                disabled={loading || !youtubeUrl.trim()}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaYoutube />
                    Add from YouTube
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Manual Add */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-600/20 flex items-center justify-center">
                <FaMusic className="text-rose-500 text-xl" />
              </div>
              <div>
                <h3 className="font-semibold">Add Manually</h3>
                <p className="text-sm text-gray-400">Add a song with a direct audio URL</p>
              </div>
            </div>

            <form onSubmit={handleAddManualSong} className="space-y-3">
              <input
                name="title"
                placeholder="Song title *"
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-rose-500 text-white placeholder-gray-500"
              />
              <input
                name="artist"
                placeholder="Artist name *"
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-rose-500 text-white placeholder-gray-500"
              />
              <input
                name="audioUrl"
                placeholder="Direct audio URL (MP3, etc.) *"
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-rose-500 text-white placeholder-gray-500"
              />
              <input
                name="coverImage"
                placeholder="Cover image URL (optional)"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-rose-500 text-white placeholder-gray-500"
              />
              <select
                name="albumId"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-rose-500 text-white"
              >
                <option value="">No Album</option>
                {albums.map((album) => (
                  <option key={album.$id} value={album.$id}>
                    {album.title} - {album.artist}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-800 disabled:cursor-not-allowed rounded-xl font-semibold transition-all"
              >
                {loading ? 'Adding...' : 'Add Song'}
              </button>
            </form>
          </div>

          {/* Album Management */}
          <div className="glass rounded-2xl p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Albums ({albums.length})</h3>
              <button
                onClick={() => setShowAddAlbum(!showAddAlbum)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-all"
              >
                <FaPlus className="inline mr-1" /> New Album
              </button>
            </div>

            {showAddAlbum && (
              <form onSubmit={handleAddAlbum} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-4 bg-white/5 rounded-xl">
                <input
                  value={newAlbum.title}
                  onChange={(e) => setNewAlbum({ ...newAlbum, title: e.target.value })}
                  placeholder="Album title"
                  required
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-rose-500 text-white placeholder-gray-500"
                />
                <input
                  value={newAlbum.artist}
                  onChange={(e) => setNewAlbum({ ...newAlbum, artist: e.target.value })}
                  placeholder="Artist"
                  required
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-rose-500 text-white placeholder-gray-500"
                />
                <input
                  value={newAlbum.coverImage}
                  onChange={(e) => setNewAlbum({ ...newAlbum, coverImage: e.target.value })}
                  placeholder="Cover image URL"
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-rose-500 text-white placeholder-gray-500"
                />
                <div className="sm:col-span-3 flex gap-2">
                  <button type="submit" disabled={loading} className="px-6 py-2 bg-rose-600 hover:bg-rose-700 rounded-xl font-medium transition-all">
                    Create Album
                  </button>
                  <button type="button" onClick={() => setShowAddAlbum(false)} className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {albums.map((album) => (
                <div key={album.$id} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all">
                  <div className="aspect-square rounded-lg bg-rose-600/10 overflow-hidden mb-3">
                    {album.coverImage ? (
                      <img src={album.coverImage} alt={album.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FaMusic className="text-rose-400 text-3xl" />
                      </div>
                    )}
                  </div>
                  <h4 className="font-medium truncate">{album.title}</h4>
                  <p className="text-sm text-gray-400 truncate">{album.artist}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Manage Songs */
        <div className="glass rounded-2xl overflow-hidden">
          <div className="divide-y divide-white/5">
            {songs.length === 0 ? (
              <div className="p-12 text-center">
                <FaMusic className="text-4xl text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No songs yet. Add some music!</p>
              </div>
            ) : (
              songs.map((song, i) => (
                <div key={song.$id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-all group">
                  <span className="text-sm text-gray-500 w-8 text-center">{i + 1}</span>
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-rose-600/10 flex-shrink-0">
                    {song.coverImage ? (
                      <img src={song.coverImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FaMusic className="text-rose-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{song.title}</p>
                    <p className="text-sm text-gray-400 truncate">{song.artist}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {song.youtubeVideoId && (
                      <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded-full">YouTube</span>
                    )}
                    {song.youtubeUrl && (
                      <a href={song.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 transition-colors">
                        <FaYoutube className="text-xl" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteSong(song.$id)}
                      className="p-2 text-gray-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
