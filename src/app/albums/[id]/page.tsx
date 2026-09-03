'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { databases, storage, DATABASE_ID, SONGS_COLLECTION_ID, ALBUMS_COLLECTION_ID, STORAGE_BUCKET_ID, IMAGE_STORAGE_BUCKET_ID } from '@/lib/appwrite';
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
import SongCard from '@/components/SongCard';
import { FaCompactDisc, FaPlay, FaRandom, FaArrowLeft, FaEdit, FaCheck, FaTimes, FaImage, FaLink, FaUpload, FaSpinner } from 'react-icons/fa';
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

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [coverImageInput, setCoverImageInput] = useState('');
  const [coverImagePreview, setCoverImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [coverSource, setCoverSource] = useState<'url' | 'upload'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      // Create a preview
      const previewUrl = URL.createObjectURL(file);
      setCoverImagePreview(previewUrl);

      // Upload to Appwrite Storage (Cover Images bucket)
      const fileId = ID.unique();
      const uploadedFile = await storage.createFile(IMAGE_STORAGE_BUCKET_ID, fileId, file);

      // Get the file URL
      const fileUrl = storage.getFileView(IMAGE_STORAGE_BUCKET_ID, uploadedFile.$id);
      setCoverImageInput(fileUrl);
      toast.success('Image uploaded successfully!');
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload image: ' + (error.message || 'Unknown error'));
      setCoverImagePreview(album?.coverImage || '');
    } finally {
      setUploading(false);
    }
  };

  const saveChanges = async () => {
    if (!editTitle.trim()) {
      toast.error('Album title cannot be empty');
      return;
    }

    setUploading(true);
    try {
      const updates: Record<string, any> = {};

      if (editTitle.trim() !== album?.title) {
        updates.title = editTitle.trim();
      }

      if (coverImageInput !== album?.coverImage) {
        updates.coverImage = coverImageInput;
      }

      if (Object.keys(updates).length === 0) {
        toast.success('No changes to save');
        setIsEditing(false);
        return;
      }

      await databases.updateDocument(DATABASE_ID, ALBUMS_COLLECTION_ID, albumId, updates);
      toast.success('Album updated successfully!');
      setIsEditing(false);

      // Reload album data
      await loadData();
    } catch (error: any) {
      console.error('Failed to update album:', error);
      toast.error('Failed to update album: ' + (error.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const getDisplayCover = () => {
    if (isEditing) return coverImagePreview;
    return album?.coverImage;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d14]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-teal-500/20 rounded-full" />
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-teal-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#0d0d14]">
      <Sidebar />
      <main className="flex-1 pb-[140px] lg:pb-28 min-w-0">
        <MobileHeader />
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 gradient-primary opacity-15" />
          <div className="relative z-10 px-5 sm:px-8 pt-5 sm:pt-8 pb-6">
            <button
              onClick={() => router.push('/albums')}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
            >
              <FaArrowLeft className="text-sm" />
              <span className="text-sm">Albums</span>
            </button>

            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-5">
              {/* Cover Photo */}
              <div className="relative group">
                <div
                  className={`w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-2xl bg-teal-600/10 overflow-hidden shadow-2xl shadow-black/50 flex-shrink-0 transition-all ${
                    isEditing ? 'ring-2 ring-teal-500/50' : ''
                  }`}
                >
                  {getDisplayCover() ? (
                    <img
                      src={getDisplayCover()}
                      alt={album?.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-600/20 to-orange-700/20">
                      <FaCompactDisc className="text-teal-400/40 text-5xl" />
                    </div>
                  )}

                  {/* Edit overlay button */}
                  {isEditing && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      disabled={uploading}
                    >
                      {uploading ? (
                        <FaSpinner className="text-white text-2xl animate-spin" />
                      ) : (
                        <>
                          <FaImage className="text-white text-2xl mb-2" />
                          <span className="text-white text-xs font-medium">Change Cover</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Album Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-500 mb-1">Album</p>

                {/* Editable Title */}
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 leading-tight bg-white/[0.05] border border-teal-500/50 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-teal-500 w-full"
                    placeholder="Album title"
                  />
                ) : (
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 leading-tight">{album?.title || 'Unknown Album'}</h1>
                )}

                <p className="text-gray-400 text-sm sm:text-base mb-1">{album?.artist || 'Unknown Artist'}</p>
                <p className="text-gray-500 text-xs sm:text-sm">{songs.length} songs</p>

                <div className="flex flex-wrap gap-2 sm:gap-3 mt-4">
                  {songs.length > 0 && (
                    <>
                      <button
                        onClick={playAll}
                        className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-teal-500 hover:bg-teal-600 rounded-full font-semibold transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-teal-500/20 text-sm text-black"
                      >
                        <FaPlay className="text-xs" />
                        Play All
                      </button>
                      <button
                        onClick={playShuffle}
                        className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white/[0.06] hover:bg-white/[0.1] rounded-full font-semibold transition-all text-sm"
                      >
                        <FaRandom />
                        Shuffle
                      </button>
                    </>
                  )}

                  {/* Edit / Save / Cancel buttons */}
                  {isEditing ? (
                    <>
                      <button
                        onClick={saveChanges}
                        disabled={uploading}
                        className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-700 rounded-full font-semibold transition-all text-sm text-white"
                      >
                        {uploading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                        {uploading ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={uploading}
                        className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white/[0.06] hover:bg-white/[0.1] rounded-full font-semibold transition-all text-sm"
                      >
                        <FaTimes />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={startEditing}
                      className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white/[0.06] hover:bg-white/[0.1] rounded-full font-semibold transition-all text-sm"
                    >
                      <FaEdit />
                      Edit Album
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cover Image Editor Panel */}
        {isEditing && (
          <div className="px-5 sm:px-8 pt-4 pb-2">
            <div className="glass rounded-2xl p-4 sm:p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FaImage className="text-teal-500" />
                Cover Image
              </h3>

              {/* Source toggle */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setCoverSource('url')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    coverSource === 'url'
                      ? 'bg-teal-500 text-black'
                      : 'bg-white/[0.05] text-gray-400 hover:text-white'
                  }`}
                >
                  <FaLink />
                  URL
                </button>
                <button
                  onClick={() => setCoverSource('upload')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    coverSource === 'upload'
                      ? 'bg-teal-500 text-black'
                      : 'bg-white/[0.05] text-gray-400 hover:text-white'
                  }`}
                >
                  <FaUpload />
                  Upload
                </button>
              </div>

              {/* URL input */}
              {coverSource === 'url' && (
                <div>
                  <input
                    type="url"
                    value={coverImageInput}
                    onChange={(e) => {
                      setCoverImageInput(e.target.value);
                      setCoverImagePreview(e.target.value);
                    }}
                    placeholder="https://example.com/album-cover.jpg"
                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.06] rounded-xl focus:outline-none focus:border-teal-500/50 text-white placeholder-gray-500 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Paste a direct link to an image (JPEG, PNG, GIF, or WebP)
                  </p>
                </div>
              )}

              {/* Upload input */}
              {coverSource === 'upload' && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileUpload}
                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.06] border-dashed rounded-xl focus:outline-none focus:border-teal-500/50 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-500 file:text-black file:font-semibold file:cursor-pointer hover:file:bg-teal-600"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Supports JPEG, PNG, GIF, and WebP. Max size: 10MB
                  </p>
                </div>
              )}

              {/* Preview */}
              {coverImagePreview && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-2">Preview:</p>
                  <div className="w-24 h-24 rounded-lg overflow-hidden">
                    <img
                      src={coverImagePreview}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                      onError={() => {
                        setCoverImagePreview('');
                        setCoverImageInput('');
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Songs List */}
        <div className="px-5 sm:px-8 py-5 sm:py-8">
          {songs.length === 0 ? (
            <div className="text-center py-16 sm:py-20">
              <FaCompactDisc className="text-5xl sm:text-6xl text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">No songs in this album</h3>
              <p className="text-gray-500 text-sm">Add songs to this album from the admin panel</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {songs.map((song, index) => (
                <SongCard key={song.$id} song={song} songs={songs} index={index} />
              ))}
            </div>
          )}
        </div>
      </main>
      <YouTubePlayer />
      <MobileAudioPlayer />
      <BackgroundPlayback />
      <BottomNav />
      <MiniPlayer />
      <FullPlayer />
    </div>
  );
}
