'use client';

import { useState, useEffect, useRef } from 'react';
import { databases, storage, DATABASE_ID, SONGS_COLLECTION_ID, ALBUMS_COLLECTION_ID, IMAGE_STORAGE_BUCKET_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { Song, Album } from '@/lib/types';
import toast from 'react-hot-toast';
import BottomNav from '@/components/BottomNav';
import MobileHeader from '@/components/MobileHeader';
import {
  FaYoutube,
  FaMusic,
  FaTrash,
  FaSync,
  FaPlus,
  FaSpinner,
  FaEdit,
  FaCheck,
  FaTimes,
  FaImage,
  FaLink,
  FaUpload,
} from 'react-icons/fa';

export default function AdminPage() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeAlbumId, setYoutubeAlbumId] = useState('');
  const [loading, setLoading] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [newAlbum, setNewAlbum] = useState({ title: '', artist: '', coverImage: '' });
  const [showAddAlbum, setShowAddAlbum] = useState(false);
  const [activeTab, setActiveTab] = useState<'add' | 'manage'>('add');
  const [setupLoading, setSetupLoading] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [editingAlbumId, setEditingAlbumId] = useState('');

  // Album editing state
  const [editingAlbum, setEditingAlbum] = useState<string | null>(null);
  const [editAlbumTitle, setEditAlbumTitle] = useState('');
  const [editAlbumArtist, setEditAlbumArtist] = useState('');
  const [editAlbumCoverImage, setEditAlbumCoverImage] = useState('');
  const [editAlbumCoverPreview, setEditAlbumCoverPreview] = useState('');
  const [editAlbumCoverSource, setEditAlbumCoverSource] = useState<'url' | 'upload'>('url');
  const [albumUploading, setAlbumUploading] = useState(false);
  const albumFileInputRef = useRef<HTMLInputElement>(null);

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

  const updateAlbumSongCount = async (albumId: string) => {
    if (!albumId) return;
    try {
      const songsInAlbum = await databases.listDocuments(DATABASE_ID, SONGS_COLLECTION_ID, [
        Query.equal('albumId', albumId),
      ]);
      await databases.updateDocument(DATABASE_ID, ALBUMS_COLLECTION_ID, albumId, {
        songCount: songsInAlbum.total,
      });
    } catch (error) {
      console.error('Failed to update album songCount:', error);
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
      toast.loading('🔍 Fetching video info...', { id: 'extract' });
      const response = await fetch('/api/extract-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to extract video info');
      toast.loading('💾 Saving to database...', { id: 'extract' });
      await databases.createDocument(DATABASE_ID, SONGS_COLLECTION_ID, ID.unique(), {
        title: data.title,
        artist: data.artist,
        albumId: youtubeAlbumId || '',
        coverImage: data.thumbnail,
        audioUrl: data.audioUrl || '',
        youtubeUrl: data.originalUrl,
        youtubeVideoId: data.videoId,
        duration: data.duration,
        createdAt: new Date().toISOString(),
      });
      toast.success(`Added "${data.title}"! 🎵`, { id: 'extract' });
      setYoutubeUrl('');
      setYoutubeAlbumId('');
      loadSongs();
      if (youtubeAlbumId) updateAlbumSongCount(youtubeAlbumId);
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
    if (!title || !artist || !audioUrl) { toast.error('Please fill in all required fields'); return; }
    setLoading(true);
    try {
      await databases.createDocument(DATABASE_ID, SONGS_COLLECTION_ID, ID.unique(), {
        title, artist, albumId, coverImage, audioUrl,
        youtubeUrl: '', youtubeVideoId: '', duration: 0,
        createdAt: new Date().toISOString(),
      });
      toast.success('Song added successfully!');
      form.reset();
      loadSongs();
      if (albumId) updateAlbumSongCount(albumId);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add song');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbum.title || !newAlbum.artist) { toast.error('Please fill in album title and artist'); return; }
    setLoading(true);
    try {
      await databases.createDocument(DATABASE_ID, ALBUMS_COLLECTION_ID, ID.unique(), {
        title: newAlbum.title, artist: newAlbum.artist,
        coverImage: newAlbum.coverImage, songCount: 0,
        createdAt: new Date().toISOString(),
      });
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
      const song = songs.find((s) => s.$id === songId);
      await databases.deleteDocument(DATABASE_ID, SONGS_COLLECTION_ID, songId);
      toast.success('Song deleted');
      loadSongs();
      if (song?.albumId) updateAlbumSongCount(song.albumId);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete song');
    }
  };

  const startEditAlbum = (song: Song) => {
    setEditingSongId(song.$id);
    setEditingAlbumId(song.albumId || '');
  };

  const saveEditAlbum = async (song: Song) => {
    try {
      const oldAlbumId = song.albumId;
      await databases.updateDocument(DATABASE_ID, SONGS_COLLECTION_ID, song.$id, { albumId: editingAlbumId });
      toast.success('Song updated!');
      setEditingSongId(null);
      loadSongs();
      if (oldAlbumId) updateAlbumSongCount(oldAlbumId);
      if (editingAlbumId) updateAlbumSongCount(editingAlbumId);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update song');
    }
  };

  // Album edit functions
  const startEditAlbumCard = (album: Album) => {
    setEditingAlbum(album.$id);
    setEditAlbumTitle(album.title);
    setEditAlbumArtist(album.artist);
    setEditAlbumCoverImage(album.coverImage || '');
    setEditAlbumCoverPreview(album.coverImage || '');
    setEditAlbumCoverSource('url');
  };

  const cancelEditAlbumCard = () => {
    setEditingAlbum(null);
    setEditAlbumTitle('');
    setEditAlbumArtist('');
    setEditAlbumCoverImage('');
    setEditAlbumCoverPreview('');
  };

  const handleAlbumCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    setAlbumUploading(true);
    try {
      const previewUrl = URL.createObjectURL(file);
      setEditAlbumCoverPreview(previewUrl);

      const fileId = ID.unique();
      const uploadedFile = await storage.createFile(IMAGE_STORAGE_BUCKET_ID, fileId, file);
      const fileUrl = storage.getFileView(IMAGE_STORAGE_BUCKET_ID, uploadedFile.$id);
      setEditAlbumCoverImage(fileUrl);
      toast.success('Image uploaded successfully!');
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload image: ' + (error.message || 'Unknown error'));
      setEditAlbumCoverPreview('');
      setEditAlbumCoverImage('');
    } finally {
      setAlbumUploading(false);
    }
  };

  const saveEditAlbumCard = async (albumId: string) => {
    if (!editAlbumTitle.trim()) {
      toast.error('Album title cannot be empty');
      return;
    }

    setAlbumUploading(true);
    try {
      const updates: Record<string, any> = {};
      const album = albums.find(a => a.$id === albumId);

      if (editAlbumTitle.trim() !== album?.title) {
        updates.title = editAlbumTitle.trim();
      }
      if (editAlbumArtist.trim() !== album?.artist) {
        updates.artist = editAlbumArtist.trim();
      }
      if (editAlbumCoverImage !== (album?.coverImage || '')) {
        updates.coverImage = editAlbumCoverImage;
      }

      if (Object.keys(updates).length === 0) {
        toast.success('No changes to save');
        cancelEditAlbumCard();
        return;
      }

      await databases.updateDocument(DATABASE_ID, ALBUMS_COLLECTION_ID, albumId, updates);
      toast.success('Album updated successfully!');
      cancelEditAlbumCard();
      loadAlbums();
    } catch (error: any) {
      console.error('Failed to update album:', error);
      toast.error('Failed to update album: ' + (error.message || 'Unknown error'));
    } finally {
      setAlbumUploading(false);
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    const album = albums.find(a => a.$id === albumId);
    if (!confirm(`Are you sure you want to delete "${album?.title}"? This will NOT delete songs in this album.`)) return;

    try {
      await databases.deleteDocument(DATABASE_ID, ALBUMS_COLLECTION_ID, albumId);
      toast.success('Album deleted');
      loadAlbums();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete album');
    }
  };

  const inputClass = "w-full px-4 py-3 bg-white/[0.05] border border-white/[0.06] rounded-xl focus:outline-none focus:border-teal-500/50 text-white placeholder-gray-500 text-sm";
  const smallInputClass = "w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg focus:outline-none focus:border-teal-500/50 text-white placeholder-gray-500 text-sm";

  return (
    <div className="min-h-screen bg-[#0d0d14]">
    <MobileHeader />
    <div className="p-3 sm:p-6 pt-4 sm:pt-6 pb-[140px] lg:pb-28 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Admin Panel</h1>
          <p className="text-gray-400 mt-1">Manage your music library</p>
        </div>
        <button
          onClick={setupAppwrite}
          disabled={setupLoading}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800 rounded-xl transition-all text-xs sm:text-sm font-medium whitespace-nowrap"
        >
          {setupLoading ? <FaSpinner className="animate-spin" /> : <FaSync />}
          Setup Database
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab('add')}
          className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-medium transition-all whitespace-nowrap ${
            activeTab === 'add' ? 'bg-teal-500 text-black' : 'bg-white/[0.05] text-gray-400 hover:text-white'
          }`}
        >
          <FaPlus className="inline mr-2" />
          Add Music
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-medium transition-all whitespace-nowrap ${
            activeTab === 'manage' ? 'bg-teal-500 text-black' : 'bg-white/[0.05] text-gray-400 hover:text-white'
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
              <input type="url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..." className={inputClass}
                onKeyDown={(e) => e.key === 'Enter' && handleExtractAndAdd()} />
              <select value={youtubeAlbumId} onChange={(e) => setYoutubeAlbumId(e.target.value)}
                className={inputClass}>
                <option value="">No Album</option>
                {albums.map((album) => (
                  <option key={album.$id} value={album.$id}>{album.title} - {album.artist}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500">Audio is downloaded as MP3 and stored in Appwrite for reliable playback</p>
              <button onClick={handleExtractAndAdd} disabled={loading || !youtubeUrl.trim()}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed rounded-xl font-semibold transition-all flex items-center justify-center gap-2">
                {loading ? (<><FaSpinner className="animate-spin" />Processing...</>) : (<><FaYoutube />Add from YouTube</>)}
              </button>
            </div>
          </div>

          {/* Manual Add */}
          <div className="glass rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-teal-600/20 flex items-center justify-center">
                <FaMusic className="text-teal-500 text-xl" />
              </div>
              <div>
                <h3 className="font-semibold">Add Manually</h3>
                <p className="text-sm text-gray-400">Add a song with a direct audio URL</p>
              </div>
            </div>
            <form onSubmit={handleAddManualSong} className="space-y-3">
              <input name="title" placeholder="Song title *" required className={inputClass} />
              <input name="artist" placeholder="Artist name *" required className={inputClass} />
              <input name="audioUrl" placeholder="Direct audio URL (MP3, etc.) *" required className={inputClass} />
              <input name="coverImage" placeholder="Cover image URL (optional)" className={inputClass} />
              <select name="albumId" className={inputClass}>
                <option value="">No Album</option>
                {albums.map((album) => (
                  <option key={album.$id} value={album.$id}>{album.title} - {album.artist}</option>
                ))}
              </select>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-700 disabled:cursor-not-allowed rounded-xl font-semibold transition-all text-black">
                {loading ? 'Adding...' : 'Add Song'}
              </button>
            </form>
          </div>

          {/* Album Management */}
          <div className="glass rounded-2xl p-4 sm:p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Albums ({albums.length})</h3>
              <button onClick={() => setShowAddAlbum(!showAddAlbum)}
                className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.08] rounded-xl text-sm font-medium transition-all">
                <FaPlus className="inline mr-1" /> New Album
              </button>
            </div>
            {showAddAlbum && (
              <form onSubmit={handleAddAlbum} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-4 bg-white/[0.04] rounded-xl">
                <input value={newAlbum.title} onChange={(e) => setNewAlbum({ ...newAlbum, title: e.target.value })}
                  placeholder="Album title" required className={inputClass} />
                <input value={newAlbum.artist} onChange={(e) => setNewAlbum({ ...newAlbum, artist: e.target.value })}
                  placeholder="Artist" required className={inputClass} />
                <input value={newAlbum.coverImage} onChange={(e) => setNewAlbum({ ...newAlbum, coverImage: e.target.value })}
                  placeholder="Cover image URL" className={inputClass} />
                <div className="sm:col-span-3 flex gap-2">
                  <button type="submit" disabled={loading} className="px-6 py-2 bg-teal-500 hover:bg-teal-600 rounded-xl font-medium transition-all text-black">Create Album</button>
                  <button type="button" onClick={() => setShowAddAlbum(false)} className="px-6 py-2 bg-white/[0.05] hover:bg-white/[0.08] rounded-xl font-medium transition-all">Cancel</button>
                </div>
              </form>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {albums.map((album) => (
                <div key={album.$id} className="bg-white/[0.04] rounded-xl p-4 hover:bg-white/[0.06] transition-all group">
                  {/* Cover Image */}
                  <div className="relative aspect-square rounded-lg bg-teal-600/10 overflow-hidden mb-3">
                    {(editingAlbum === album.$id ? editAlbumCoverPreview : album.coverImage) ? (
                      <img
                        src={editingAlbum === album.$id ? editAlbumCoverPreview : album.coverImage}
                        alt={album.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-600/15 to-orange-700/15">
                        <FaMusic className="text-teal-400/40 text-3xl" />
                      </div>
                    )}

                    {/* Edit overlay */}
                    {editingAlbum === album.$id && (
                      <button
                        onClick={() => albumFileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        disabled={albumUploading}
                      >
                        {albumUploading ? (
                          <FaSpinner className="text-white text-xl animate-spin" />
                        ) : (
                          <>
                            <FaImage className="text-white text-xl mb-1" />
                            <span className="text-white text-xs font-medium">Change Cover</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Non-editing hover buttons */}
                    {editingAlbum !== album.$id && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => startEditAlbumCard(album)}
                          className="p-1.5 bg-black/60 hover:bg-teal-500 rounded-lg text-white hover:text-black transition-all"
                          title="Edit album"
                        >
                          <FaEdit className="text-xs" />
                        </button>
                        <button
                          onClick={() => handleDeleteAlbum(album.$id)}
                          className="p-1.5 bg-black/60 hover:bg-red-500 rounded-lg text-white hover:text-white transition-all"
                          title="Delete album"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    )}

                    <input
                      ref={albumFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleAlbumCoverUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Album Info / Edit Form */}
                  {editingAlbum === album.$id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editAlbumTitle}
                        onChange={(e) => setEditAlbumTitle(e.target.value)}
                        placeholder="Album title"
                        className={smallInputClass}
                      />
                      <input
                        type="text"
                        value={editAlbumArtist}
                        onChange={(e) => setEditAlbumArtist(e.target.value)}
                        placeholder="Artist"
                        className={smallInputClass}
                      />

                      {/* Cover Image Source Toggle */}
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => setEditAlbumCoverSource('url')}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                            editAlbumCoverSource === 'url'
                              ? 'bg-teal-500 text-black'
                              : 'bg-white/[0.05] text-gray-400 hover:text-white'
                          }`}
                        >
                          <FaLink /> URL
                        </button>
                        <button
                          onClick={() => setEditAlbumCoverSource('upload')}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                            editAlbumCoverSource === 'upload'
                              ? 'bg-teal-500 text-black'
                              : 'bg-white/[0.05] text-gray-400 hover:text-white'
                          }`}
                        >
                          <FaUpload /> Upload
                        </button>
                      </div>

                      {editAlbumCoverSource === 'url' ? (
                        <input
                          type="url"
                          value={editAlbumCoverImage}
                          onChange={(e) => {
                            setEditAlbumCoverImage(e.target.value);
                            setEditAlbumCoverPreview(e.target.value);
                          }}
                          placeholder="Cover image URL"
                          className={smallInputClass}
                        />
                      ) : (
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleAlbumCoverUpload}
                          className="w-full px-2 py-1.5 bg-white/[0.05] border border-white/[0.06] border-dashed rounded-lg text-white text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-teal-500 file:text-black file:font-semibold file:cursor-pointer hover:file:bg-teal-600"
                        />
                      )}

                      <p className="text-xs text-gray-500 truncate">{album.songCount || 0} songs</p>

                      {/* Save / Cancel buttons */}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => saveEditAlbumCard(album.$id)}
                          disabled={albumUploading}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-green-700 rounded-lg text-xs font-medium transition-all text-white"
                        >
                          {albumUploading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                          {albumUploading ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={cancelEditAlbumCard}
                          disabled={albumUploading}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] rounded-lg text-xs font-medium transition-all"
                        >
                          <FaTimes />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h4 className="font-medium truncate">{album.title}</h4>
                      <p className="text-sm text-gray-400 truncate">{album.artist}</p>
                      <p className="text-xs text-gray-500 mt-1">{album.songCount || 0} songs</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="divide-y divide-white/[0.04]">
            {songs.length === 0 ? (
              <div className="p-12 text-center">
                <FaMusic className="text-4xl text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No songs yet. Add some music!</p>
              </div>
            ) : (
              songs.map((song, i) => (
                <div key={song.$id} className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 hover:bg-white/[0.04] transition-all group">
                  <span className="text-sm text-gray-500 w-8 text-center">{i + 1}</span>
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-teal-600/10 flex-shrink-0">
                    {song.coverImage ? (
                      <img src={song.coverImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><FaMusic className="text-teal-400/40" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{song.title}</p>
                    <p className="text-sm text-gray-400 truncate">{song.artist}</p>
                    {editingSongId === song.$id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <select value={editingAlbumId} onChange={(e) => setEditingAlbumId(e.target.value)}
                          className="px-3 py-1.5 bg-white/[0.05] border border-white/[0.06] rounded-lg focus:outline-none focus:border-teal-500/50 text-white text-sm">
                          <option value="">No Album</option>
                          {albums.map((album) => (<option key={album.$id} value={album.$id}>{album.title}</option>))}
                        </select>
                        <button onClick={() => saveEditAlbum(song)} className="p-1.5 text-green-400 hover:text-green-300"><FaCheck /></button>
                        <button onClick={() => setEditingSongId(null)} className="p-1.5 text-gray-500 hover:text-white"><FaTimes /></button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {song.albumId ? albums.find(a => a.$id === song.albumId)?.title || 'Unknown Album' : 'No Album'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {song.audioUrl && <span className="hidden sm:inline text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">MP3</span>}
                    {song.youtubeVideoId && <span className="hidden sm:inline text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded-full">YouTube</span>}
                    {song.youtubeUrl && (
                      <a href={song.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 transition-colors">
                        <FaYoutube className="text-xl" />
                      </a>
                    )}
                    {editingSongId !== song.$id && (
                      <button onClick={() => startEditAlbum(song)}
                        className="p-2 text-gray-500 hover:text-teal-400 transition-colors opacity-0 group-hover:opacity-100" title="Change album">
                        <FaEdit />
                      </button>
                    )}
                    <button onClick={() => handleDeleteSong(song.$id)}
                      className="p-2 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
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
    <BottomNav />
    </div>
  );
}
