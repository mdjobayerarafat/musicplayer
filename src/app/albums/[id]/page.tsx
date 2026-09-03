'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { databases, storage, DATABASE_ID, SONGS_COLLECTION_ID, ALBUMS_COLLECTION_ID, IMAGE_STORAGE_BUCKET_ID } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { Song, Album } from '@/lib/types';
import { usePlayerStore } from '@/store/playerStore';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import MiniPlayer from '@/components/MiniPlayer';
import FullPlayer from '@/components/FullPlayer';
import YouTubePlayer from '@/components/YouTubePlayer';
import MobileAudioPlayer from '@/components/MobileAudioPlayer';
import BackgroundPlayback from '@/components/BackgroundPlayback';
import MobileHeader from '@/components/MobileHeader';
import {
  FaCompactDisc, FaPlay, FaRandom, FaArrowLeft, FaEdit, FaCheck, FaTimes,
  FaImage, FaLink, FaUpload, FaSpinner, FaTrash, FaMicrophone,
  FaGripVertical, FaMusic,
} from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function AlbumDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const albumId = params.id as string;
  const [album, setAlbum] = useState<Album | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const { setCurrentSong, setQueue } = usePlayerStore();

  // Album edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [coverImageInput, setCoverImageInput] = useState('');
  const [coverImagePreview, setCoverImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [coverSource, setCoverSource] = useState<'url' | 'upload'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Song edit state
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [editSongTitle, setEditSongTitle] = useState('');
  const [editSongArtist, setEditSongArtist] = useState('');
  const [editSongCover, setEditSongCover] = useState('');
  const [editSongLyrics, setEditSongLyrics] = useState('');
  const [showLyricsFor, setShowLyricsFor] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && albumId) loadData();
  }, [user, albumId]);

  const loadData = async () => {
    try {
      const [albumRes, songsRes] = await Promise.allSettled([
        databases.getDocument(DATABASE_ID, ALBUMS_COLLECTION_ID, albumId),
        databases.listDocuments(DATABASE_ID, SONGS_COLLECTION_ID, [
          Query.equal('albumId', albumId),
        ]),
      ]);
      if (albumRes.status === 'fulfilled') setAlbum(albumRes.value as unknown as Album);
      if (songsRes.status === 'fulfilled') setSongs(songsRes.value.documents as unknown as Song[]);
    } catch (error) {
      console.error('Failed to load album data:', error);
    } finally {
      setLoading(false);
    }
  };

  const playAll = () => {
    if (songs.length > 0) { setQueue(songs); setCurrentSong(songs[0]); }
  };

  const playShuffle = () => {
    if (songs.length > 0) {
      const shuffled = [...songs].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      setCurrentSong(shuffled[0]);
    }
  };

  // Album edit functions
  const startEditing = () => {
    setEditTitle(album?.title || '');
    setCoverImageInput(album?.coverImage || '');
    setCoverImagePreview(album?.coverImage || '');
    setCoverSource('url');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditTitle('');
    setCoverImageInput('');
    setCoverImagePreview('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) { toast.error('Please select a valid image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be less than 10MB'); return; }

    setUploading(true);
    try {
      const previewUrl = URL.createObjectURL(file);
      setCoverImagePreview(previewUrl);
      const fileId = ID.unique();
      const uploadedFile = await storage.createFile(IMAGE_STORAGE_BUCKET_ID, fileId, file);
      const fileUrl = storage.getFileView(IMAGE_STORAGE_BUCKET_ID, uploadedFile.$id);
      setCoverImageInput(fileUrl);
      toast.success('Image uploaded!');
    } catch (error: any) {
      toast.error('Upload failed: ' + (error.message || 'Unknown'));
      setCoverImagePreview(album?.coverImage || '');
    } finally {
      setUploading(false);
    }
  };

  const saveChanges = async () => {
    if (!editTitle.trim()) { toast.error('Album title cannot be empty'); return; }
    setUploading(true);
    try {
      const updates: Record<string, any> = {};
      if (editTitle.trim() !== album?.title) updates.title = editTitle.trim();
      if (coverImageInput !== album?.coverImage) updates.coverImage = coverImageInput;
      if (Object.keys(updates).length === 0) { toast.success('No changes'); setIsEditing(false); return; }
      await databases.updateDocument(DATABASE_ID, ALBUMS_COLLECTION_ID, albumId, updates);
      toast.success('Album updated!');
      setIsEditing(false);
      await loadData();
    } catch (error: any) {
      toast.error('Failed: ' + (error.message || 'Unknown'));
    } finally {
      setUploading(false);
    }
  };

  // Song edit functions
  const startEditSong = (song: Song) => {
    setEditingSongId(song.$id);
    setEditSongTitle(song.title);
    setEditSongArtist(song.artist);
    setEditSongCover(song.coverImage || '');
    setEditSongLyrics(song.lyrics || '');
  };

  const cancelEditSong = () => {
    setEditingSongId(null);
    setEditSongTitle('');
    setEditSongArtist('');
    setEditSongCover('');
    setEditSongLyrics('');
  };

  const saveEditSong = async (song: Song) => {
    if (!editSongTitle.trim() || !editSongArtist.trim()) {
      toast.error('Title and artist are required');
      return;
    }
    try {
      const updates: Record<string, any> = {};
      if (editSongTitle.trim() !== song.title) updates.title = editSongTitle.trim();
      if (editSongArtist.trim() !== song.artist) updates.artist = editSongArtist.trim();
      if (editSongCover !== (song.coverImage || '')) updates.coverImage = editSongCover;
      if (editSongLyrics !== (song.lyrics || '')) updates.lyrics = editSongLyrics;

      if (Object.keys(updates).length === 0) { toast.success('No changes'); cancelEditSong(); return; }
      await databases.updateDocument(DATABASE_ID, SONGS_COLLECTION_ID, song.$id, updates);
      toast.success('Song updated!');
      cancelEditSong();
      loadData();
    } catch (error: any) {
      toast.error('Failed: ' + (error.message || 'Unknown'));
    }
  };

  const removeFromAlbum = async (song: Song) => {
    if (!confirm(`Remove "${song.title}" from this album?`)) return;
    try {
      await databases.updateDocument(DATABASE_ID, SONGS_COLLECTION_ID, song.$id, { albumId: '' });
      toast.success('Song removed from album');
      loadData();
    } catch (error: any) {
      toast.error('Failed: ' + (error.message || 'Unknown'));
    }
  };

  const deleteSong = async (song: Song) => {
    if (!confirm(`Delete "${song.title}" permanently?`)) return;
    try {
      await databases.deleteDocument(DATABASE_ID, SONGS_COLLECTION_ID, song.$id);
      toast.success('Song deleted');
      loadData();
    } catch (error: any) {
      toast.error('Failed: ' + (error.message || 'Unknown'));
    }
  };

  const moveSong = async (song: Song, direction: 'up' | 'down') => {
    const idx = songs.findIndex(s => s.$id === song.$id);
    if (direction === 'up' && idx > 0) {
      const other = songs[idx - 1];
      try {
        await Promise.all([
          databases.updateDocument(DATABASE_ID, SONGS_COLLECTION_ID, song.$id, { songOrder: idx - 1 }),
          databases.updateDocument(DATABASE_ID, SONGS_COLLECTION_ID, other.$id, { songOrder: idx }),
        ]);
        loadData();
      } catch (error: any) {
        toast.error('Failed to reorder: ' + (error.message || 'Unknown'));
      }
    } else if (direction === 'down' && idx < songs.length - 1) {
      const other = songs[idx + 1];
      try {
        await Promise.all([
          databases.updateDocument(DATABASE_ID, SONGS_COLLECTION_ID, song.$id, { songOrder: idx + 1 }),
          databases.updateDocument(DATABASE_ID, SONGS_COLLECTION_ID, other.$id, { songOrder: idx }),
        ]);
        loadData();
      } catch (error: any) {
        toast.error('Failed to reorder: ' + (error.message || 'Unknown'));
      }
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d14]">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-teal-500/20 rounded-full" />
          <div className="absolute top-0 left-0 w-14 h-14 border-4 border-transparent border-t-teal-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const inputClass = "w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg focus:outline-none focus:border-teal-500/50 text-white placeholder-gray-500 text-sm";

  return (
    <div className="flex min-h-screen bg-[#0d0d14]">
      <Sidebar />
      <main className="flex-1 pb-[140px] lg:pb-28 min-w-0">
        <MobileHeader />

        {/* Album Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 gradient-primary opacity-15" />
          <div className="relative z-10 px-4 sm:px-8 pt-4 sm:pt-8 pb-5 sm:pb-6">
            <button onClick={() => router.push('/albums')}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors">
              <FaArrowLeft className="text-sm" /><span className="text-sm">Albums</span>
            </button>

            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-5">
              {/* Cover Photo */}
              <div className="relative group">
                <div className={`w-28 h-28 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-2xl bg-teal-600/10 overflow-hidden shadow-2xl shadow-black/50 flex-shrink-0 transition-all ${isEditing ? 'ring-2 ring-teal-500/50' : ''}`}>
                  {isEditing ? (coverImagePreview || album?.coverImage) : album?.coverImage ? (
                    <img src={isEditing ? coverImagePreview : album?.coverImage} alt={album?.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-600/20 to-orange-700/20">
                      <FaCompactDisc className="text-teal-400/40 text-4xl sm:text-5xl" />
                    </div>
                  )}
                  {isEditing && (
                    <button onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      disabled={uploading}>
                      {uploading ? <FaSpinner className="text-white text-2xl animate-spin" /> : (
                        <><FaImage className="text-white text-xl mb-1" /><span className="text-white text-xs">Change Cover</span></>
                      )}
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </div>

              {/* Album Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-500 mb-1">Album</p>
                {isEditing ? (
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                    className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 leading-tight bg-white/[0.05] border border-teal-500/50 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-teal-500 w-full"
                    placeholder="Album title" />
                ) : (
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 leading-tight">{album?.title}</h1>
                )}
                <p className="text-gray-400 text-sm mb-0.5">{album?.artist}</p>
                <p className="text-gray-500 text-xs">{songs.length} songs</p>

                <div className="flex flex-wrap gap-2 mt-3">
                  {songs.length > 0 && !isEditing && (
                    <>
                      <button onClick={playAll}
                        className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-teal-500 hover:bg-teal-600 rounded-full font-semibold transition-all text-sm text-black">
                        <FaPlay className="text-xs" />Play All
                      </button>
                      <button onClick={playShuffle}
                        className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white/[0.06] hover:bg-white/[0.1] rounded-full font-semibold transition-all text-sm">
                        <FaRandom />Shuffle
                      </button>
                    </>
                  )}
                  {isEditing ? (
                    <>
                      <button onClick={saveChanges} disabled={uploading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-700 rounded-full font-semibold transition-all text-sm text-white">
                        {uploading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                        {uploading ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={cancelEditing} disabled={uploading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] rounded-full font-semibold transition-all text-sm">
                        <FaTimes />Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={startEditing}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] rounded-full font-semibold transition-all text-sm">
                      <FaEdit />Edit Album
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Songs List with Management */}
        <div className="px-4 sm:px-8 py-4 sm:py-6">
          {songs.length === 0 ? (
            <div className="text-center py-16">
              <FaCompactDisc className="text-5xl text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">No songs in this album</h3>
              <p className="text-gray-500 text-sm">Add songs from the admin panel</p>
            </div>
          ) : (
            <div className="space-y-1">
              {songs.map((song, index) => {
                const isEditingSong = editingSongId === song.$id;
                return (
                  <div key={song.$id} className={`rounded-xl transition-all ${isEditingSong ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'}`}>
                    {/* Song Row */}
                    <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl cursor-pointer group"
                      onClick={() => !isEditingSong && (setQueue(songs), setCurrentSong(song))}>

                      {/* Reorder buttons */}
                      <div className="hidden sm:flex flex-col gap-0.5 flex-shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); moveSong(song, 'up'); }}
                          disabled={index === 0}
                          className="text-gray-600 hover:text-white text-[10px] disabled:opacity-20 transition-colors">▲</button>
                        <button onClick={(e) => { e.stopPropagation(); moveSong(song, 'down'); }}
                          disabled={index === songs.length - 1}
                          className="text-gray-600 hover:text-white text-[10px] disabled:opacity-20 transition-colors">▼</button>
                      </div>

                      {/* Number */}
                      <span className="w-6 text-center text-xs text-gray-500 flex-shrink-0">{index + 1}</span>

                      {/* Cover */}
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden bg-teal-600/10 flex-shrink-0 flex items-center justify-center">
                        {song.coverImage ? (
                          <img src={song.coverImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <FaMusic className="text-teal-400/50 text-sm" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">{song.title}</p>
                        <p className="text-[11px] text-gray-500 truncate">{song.artist}</p>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {song.lyrics && <span className="text-[9px] text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded-full hidden sm:inline">Lyrics</span>}
                      </div>

                      {/* Action buttons */}
                      {!isEditingSong && (
                        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setShowLyricsFor(showLyricsFor === song.$id ? null : song.$id); }}
                            className="p-1.5 text-gray-500 hover:text-purple-400 transition-colors" title="View lyrics">
                            <FaMicrophone className="text-xs" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); startEditSong(song); }}
                            className="p-1.5 text-gray-500 hover:text-teal-400 transition-colors" title="Edit song">
                            <FaEdit className="text-xs" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); removeFromAlbum(song); }}
                            className="p-1.5 text-gray-500 hover:text-orange-400 transition-colors" title="Remove from album">
                            <FaArrowLeft className="text-xs" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); deleteSong(song); }}
                            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors" title="Delete song">
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Lyrics viewer */}
                    {showLyricsFor === song.$id && song.lyrics && (
                      <div className="px-4 pb-3 ml-14">
                        <div className="bg-white/[0.03] rounded-lg p-3 max-h-[150px] overflow-y-auto scrollbar-hide">
                          <p className="text-xs text-purple-400 font-medium mb-2">Lyrics</p>
                          <div className="space-y-1">
                            {song.lyrics.split('\n').filter(l => l.trim()).map((line, i) => (
                              <p key={i} className="text-sm text-gray-300 leading-relaxed">{line.trim()}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Inline Song Edit Form */}
                    {isEditingSong && (
                      <div className="px-4 pb-4 ml-0 sm:ml-14">
                        <div className="bg-white/[0.03] rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <FaEdit className="text-teal-400 text-sm" />
                            <span className="text-sm font-medium text-teal-400">Edit &quot;{song.title}&quot;</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">Title</label>
                              <input type="text" value={editSongTitle} onChange={(e) => setEditSongTitle(e.target.value)}
                                className={inputClass} placeholder="Song title" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">Artist</label>
                              <input type="text" value={editSongArtist} onChange={(e) => setEditSongArtist(e.target.value)}
                                className={inputClass} placeholder="Artist name" />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Cover Image URL</label>
                            <input type="url" value={editSongCover} onChange={(e) => setEditSongCover(e.target.value)}
                              className={inputClass} placeholder="https://example.com/cover.jpg" />
                            {editSongCover && (
                              <img src={editSongCover} alt="" className="w-12 h-12 rounded-lg object-cover mt-2"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            )}
                          </div>

                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Lyrics</label>
                            <textarea value={editSongLyrics} onChange={(e) => setEditSongLyrics(e.target.value)}
                              rows={6} placeholder="Paste or type lyrics here..."
                              className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg focus:outline-none focus:border-purple-500/50 text-white placeholder-gray-500 text-sm resize-none" />
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button onClick={() => saveEditSong(song)}
                              className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded-lg text-sm font-medium transition-all text-black">
                              <FaCheck /> Save
                            </button>
                            <button onClick={cancelEditSong}
                              className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] rounded-lg text-sm font-medium transition-all">
                              <FaTimes /> Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <YouTubePlayer /><MobileAudioPlayer /><BackgroundPlayback />
      <BottomNav /><MiniPlayer /><FullPlayer />
    </div>
  );
}
