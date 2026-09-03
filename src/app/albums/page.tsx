'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { databases, DATABASE_ID, ALBUMS_COLLECTION_ID } from '@/lib/appwrite';
import { Album } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import MiniPlayer from '@/components/MiniPlayer';
import FullPlayer from '@/components/FullPlayer';
import YouTubePlayer from '@/components/YouTubePlayer';
import { FaCompactDisc, FaMusic } from 'react-icons/fa';

export default function AlbumsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadAlbums();
    }
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

      <main className="flex-1 pb-24">
        <div className="px-4 sm:px-8 pt-20 lg:pt-8 pb-6 sm:py-8">
          <h1 className="text-3xl font-bold mb-2">Albums</h1>
          <p className="text-gray-400 mb-8">{albums.length} albums</p>

          {albums.length === 0 ? (
            <div className="text-center py-20">
              <FaCompactDisc className="text-6xl text-gray-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No albums yet</h3>
              <p className="text-gray-500 mb-6">Create albums from the admin panel</p>
              <button
                onClick={() => router.push('/admin')}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-700 rounded-xl font-semibold transition-all"
              >
                Go to Admin
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {albums.map((album) => (
                <div
                  key={album.$id}
                  className="group bg-white/5 hover:bg-white/10 rounded-2xl p-5 transition-all cursor-pointer"
                >
                  <div className="aspect-square rounded-xl bg-rose-600/10 overflow-hidden mb-4 relative">
                    {album.coverImage ? (
                      <img src={album.coverImage} alt={album.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FaCompactDisc className="text-rose-400 text-4xl" />
                      </div>
                    )}
                    <button className="absolute bottom-3 right-3 w-12 h-12 rounded-full bg-rose-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-lg shadow-rose-600/30">
                      <FaMusic className="text-white ml-0.5" />
                    </button>
                  </div>
                  <h3 className="font-semibold truncate">{album.title}</h3>
                  <p className="text-sm text-gray-400 truncate">{album.artist}</p>
                  <p className="text-xs text-gray-500 mt-1">{album.songCount || 0} songs</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <YouTubePlayer />
      <MiniPlayer />
      <FullPlayer />
    </div>
  );
}
