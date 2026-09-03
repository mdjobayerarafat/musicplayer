'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { databases, DATABASE_ID, SONGS_COLLECTION_ID, ALBUMS_COLLECTION_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
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
import { FaCompactDisc, FaPlay, FaRandom, FaArrowLeft } from 'react-icons/fa';

export default function AlbumDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const albumId = params.id as string;
  const [album, setAlbum] = useState<Album | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const { setCurrentSong, setQueue } = usePlayerStore();

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f14]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-amber-500/20 rounded-full" />
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-amber-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#0f0f14]">
      <Sidebar />
      <main className="flex-1 pb-36 lg:pb-28 min-w-0">
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
              <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-2xl bg-amber-600/10 overflow-hidden shadow-2xl shadow-black/50 flex-shrink-0">
                {album?.coverImage ? (
                  <img src={album.coverImage} alt={album.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-600/20 to-orange-700/20">
                    <FaCompactDisc className="text-amber-400/40 text-5xl" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-1">Album</p>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 leading-tight">{album?.title || 'Unknown Album'}</h1>
                <p className="text-gray-400 text-sm sm:text-base mb-1">{album?.artist || 'Unknown Artist'}</p>
                <p className="text-gray-500 text-xs sm:text-sm">{songs.length} songs</p>

                {songs.length > 0 && (
                  <div className="flex flex-wrap gap-2 sm:gap-3 mt-4">
                    <button
                      onClick={playAll}
                      className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-amber-500 hover:bg-amber-600 rounded-full font-semibold transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20 text-sm text-black"
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

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
