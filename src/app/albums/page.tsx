'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { databases, DATABASE_ID, ALBUMS_COLLECTION_ID } from '@/lib/appwrite';
import { Album } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import MiniPlayer from '@/components/MiniPlayer';
import FullPlayer from '@/components/FullPlayer';
import YouTubePlayer from '@/components/YouTubePlayer';
import MobileAudioPlayer from '@/components/MobileAudioPlayer';
import BackgroundPlayback from '@/components/BackgroundPlayback';
import Link from 'next/link';
import MobileHeader from '@/components/MobileHeader';
import { FaCompactDisc, FaMusic, FaPlay, FaSearch } from 'react-icons/fa';

export default function AlbumsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) loadAlbums();
  }, [user]);

  const loadAlbums = async () => {
    try {
      const response = await databases.listDocuments(DATABASE_ID, ALBUMS_COLLECTION_ID);
      setAlbums(response.documents as unknown as Album[]);
    } catch (error) {
      console.error('Failed to load albums:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAlbums = albums.filter(
    (a) =>
      a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.artist?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <MobileHeader />
        <div className="px-4 sm:px-8 pt-4 sm:pt-8 pb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">Albums</h1>

          <div className="relative mb-6 max-w-md">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search albums..."
              className="w-full pl-12 pr-4 py-3 bg-white/[0.05] border border-white/[0.06] rounded-xl focus:outline-none focus:border-teal-500/50 text-white placeholder-gray-500 text-sm"
            />
          </div>

          <p className="text-gray-400 text-sm mb-6">{filteredAlbums.length} albums</p>

          {filteredAlbums.length === 0 ? (
            <div className="text-center py-16 sm:py-20">
              <FaCompactDisc className="text-5xl sm:text-6xl text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-400 mb-2">
                {searchQuery ? 'No albums found' : 'No albums yet'}
              </h3>
              <p className="text-gray-500 text-sm">
                {searchQuery ? 'Try a different search' : 'Create albums from the admin panel'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredAlbums.map((album) => (
                <Link
                  key={album.$id}
                  href={`/albums/${album.$id}`}
                  className="group bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl p-3.5 transition-all cursor-pointer active:scale-[0.97]"
                >
                  <div className="aspect-square rounded-xl bg-teal-600/10 overflow-hidden mb-3 relative">
                    {album.coverImage ? (
                      <img src={album.coverImage} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-600/15 to-orange-700/15">
                        <FaCompactDisc className="text-teal-400/40 text-3xl" />
                      </div>
                    )}
                    <div className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-lg shadow-teal-500/30">
                      <FaPlay className="text-black text-sm ml-0.5" />
                    </div>
                  </div>
                  <h3 className="font-semibold truncate text-sm">{album.title}</h3>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{album.artist}</p>
                  <p className="text-[11px] text-gray-600 mt-1">{album.songCount || 0} songs</p>
                </Link>
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
