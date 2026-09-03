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
import { FaCompactDisc, FaMusic, FaPlay } from 'react-icons/fa';

export default function AlbumsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

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
      <main className="flex-1 pb-28 min-w-0">
        <div className="px-5 sm:px-8 pt-5 sm:pt-8 pb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1.5">Albums</h1>
          <p className="text-gray-400 text-sm mb-6">{albums.length} albums</p>

          {albums.length === 0 ? (
            <div className="text-center py-16 sm:py-20">
              <FaCompactDisc className="text-5xl sm:text-6xl text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-400 mb-2">No albums yet</h3>
              <p className="text-gray-500 text-sm">Create albums from the admin panel</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {albums.map((album) => (
                <div key={album.$id} className="group bg-white/[0.04] hover:bg-white/[0.08] rounded-2xl p-3.5 transition-all cursor-pointer active:scale-[0.97]">
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
