'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { databases, DATABASE_ID, SONGS_COLLECTION_ID } from '@/lib/appwrite';
import { Song } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import MiniPlayer from '@/components/MiniPlayer';
import FullPlayer from '@/components/FullPlayer';
import YouTubePlayer from '@/components/YouTubePlayer';
import MobileAudioPlayer from '@/components/MobileAudioPlayer';
import BackgroundPlayback from '@/components/BackgroundPlayback';
import SongCard from '@/components/SongCard';
import MobileHeader from '@/components/MobileHeader';
import { FaSearch, FaMusic } from 'react-icons/fa';

export default function SongsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) loadSongs();
  }, [user]);

  const loadSongs = async () => {
    try {
      const response = await databases.listDocuments(DATABASE_ID, SONGS_COLLECTION_ID);
      setSongs(response.documents as unknown as Song[]);
    } catch (error) {
      console.error('Failed to load songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSongs = songs.filter(
    (song) =>
      song.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="px-4 sm:px-8 pt-4 sm:pt-8 pb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Songs</h1>

          <div className="relative mb-6 max-w-md">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs..."
              className="w-full pl-12 pr-4 py-3 bg-white/[0.05] border border-white/[0.06] rounded-xl focus:outline-none focus:border-amber-500/50 text-white placeholder-gray-500 text-sm"
            />
          </div>

          {filteredSongs.length === 0 ? (
            <div className="text-center py-16 sm:py-20">
              <FaMusic className="text-5xl sm:text-6xl text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-400">
                {searchQuery ? 'No songs found' : 'No songs yet'}
              </h3>
              <p className="text-gray-500 mt-2 text-sm">
                {searchQuery ? 'Try a different search' : 'Add some music from the admin panel'}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredSongs.map((song, index) => (
                <SongCard key={song.$id} song={song} songs={filteredSongs} index={index} />
              ))}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
      <YouTubePlayer />
      <MobileAudioPlayer />
      <BackgroundPlayback />
      <MiniPlayer />
      <FullPlayer />
    </div>
  );
}
