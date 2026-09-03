'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { databases, DATABASE_ID, SONGS_COLLECTION_ID, ALBUMS_COLLECTION_ID } from '@/lib/appwrite';
import { Song, Album } from '@/lib/types';
import { usePlayerStore } from '@/store/playerStore';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import MiniPlayer from '@/components/MiniPlayer';
import FullPlayer from '@/components/FullPlayer';
import YouTubePlayer from '@/components/YouTubePlayer';
import BackgroundPlayback from '@/components/BackgroundPlayback';
import SongCard from '@/components/SongCard';
import { FaPlay, FaRandom, FaMusic, FaCompactDisc, FaFire, FaHeart, FaClock, FaPodcast } from 'react-icons/fa';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const { setCurrentSong, setQueue } = usePlayerStore();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [songsRes, albumsRes] = await Promise.allSettled([
        databases.listDocuments(DATABASE_ID, SONGS_COLLECTION_ID),
        databases.listDocuments(DATABASE_ID, ALBUMS_COLLECTION_ID),
      ]);
      if (songsRes.status === 'fulfilled') setSongs(songsRes.value.documents as unknown as Song[]);
      if (albumsRes.status === 'fulfilled') setAlbums(albumsRes.value.documents as unknown as Album[]);
    } catch (error) {
      console.error('Failed to load data:', error);
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
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-rose-500/20 rounded-full" />
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-rose-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar />

      <main className="flex-1 pb-28 lg:pb-28 min-w-0">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 gradient-primary opacity-30" />
          <div className="absolute top-0 right-0 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] bg-rose-600/20 rounded-full blur-[100px] -translate-y-1/2" />

          <div className="relative z-10 px-5 sm:px-8 pt-[72px] sm:pt-12 pb-5 sm:pb-6">
            <h1 className="text-[22px] sm:text-4xl lg:text-5xl font-bold mb-1.5 leading-tight">
              Welcome back,<br className="sm:hidden" /> <span className="text-rose-400">{user.name?.split(' ')[0] || 'Music Lover'}</span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-lg mb-5 sm:mb-7">
              {songs.length} songs • {albums.length} albums
            </p>

            {songs.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={playAll}
                  className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-rose-600 hover:bg-rose-700 rounded-full font-semibold transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-rose-600/20 text-sm"
                >
                  <FaPlay className="text-xs" />
                  Play All
                </button>
                <button
                  onClick={playShuffle}
                  className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white/10 hover:bg-white/20 rounded-full font-semibold transition-all backdrop-blur-sm text-sm"
                >
                  <FaRandom />
                  Shuffle
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 sm:px-8 py-5 sm:py-8">
          {/* Quick Categories */}
          <div className="grid grid-cols-2 gap-3 mb-7 sm:mb-10">
            {[
              { icon: FaFire, label: 'Trending', color: 'from-orange-500 to-red-500' },
              { icon: FaHeart, label: 'Favorites', color: 'from-pink-500 to-rose-500' },
              { icon: FaClock, label: 'Recent', color: 'from-blue-500 to-indigo-500' },
              { icon: FaPodcast, label: 'Podcasts', color: 'from-purple-500 to-violet-500' },
            ].map((cat) => (
              <button
                key={cat.label}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] transition-all text-left group active:scale-[0.97]"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                  <cat.icon className="text-white text-base" />
                </div>
                <span className="font-medium text-sm">{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Albums */}
          {albums.length > 0 && (
            <section className="mb-8 sm:mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-2xl font-bold">Albums</h2>
                <button className="text-xs sm:text-sm text-rose-400 hover:text-rose-300 transition-colors font-medium">
                  View All
                </button>
              </div>
              {/* Horizontal scroll on mobile, grid on desktop */}
              <div className="flex gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:overflow-visible [-webkit-overflow-scrolling:touch] scrollbar-hide">
                {albums.slice(0, 5).map((album) => (
                  <div
                    key={album.$id}
                    className="group bg-white/[0.04] hover:bg-white/[0.08] rounded-2xl p-3.5 transition-all cursor-pointer min-w-[150px] sm:min-w-0 active:scale-[0.97]"
                  >
                    <div className="aspect-square rounded-xl bg-rose-600/10 overflow-hidden mb-3 relative">
                      {album.coverImage ? (
                        <img src={album.coverImage} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FaCompactDisc className="text-rose-400 text-3xl" />
                        </div>
                      )}
                      <button className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-rose-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-lg shadow-rose-600/30">
                        <FaPlay className="text-white text-sm ml-0.5" />
                      </button>
                    </div>
                    <h3 className="font-semibold truncate text-sm">{album.title}</h3>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{album.artist}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Songs List */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-2xl font-bold">All Songs</h2>
              <span className="text-xs text-gray-500">{songs.length} tracks</span>
            </div>

            {songs.length === 0 ? (
              <div className="text-center py-16 sm:py-20">
                <FaMusic className="text-5xl sm:text-6xl text-gray-700 mx-auto mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-gray-400 mb-2">No songs yet</h3>
                <p className="text-gray-500 mb-6 text-sm">Add some music from the admin panel</p>
                <button
                  onClick={() => router.push('/admin')}
                  className="px-6 py-3 bg-rose-600 hover:bg-rose-700 rounded-xl font-semibold transition-all shadow-lg shadow-rose-600/20"
                >
                  Go to Admin
                </button>
              </div>
            ) : (
              <div className="space-y-0.5">
                {songs.map((song, index) => (
                  <SongCard key={song.$id} song={song} songs={songs} index={index} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <YouTubePlayer />
      <BackgroundPlayback />
      <BottomNav />
      <MiniPlayer />
      <FullPlayer />
    </div>
  );
}
