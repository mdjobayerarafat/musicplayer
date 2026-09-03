'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import SongCard from '@/components/SongCard';
import MobileHeader from '@/components/MobileHeader';
import { FaSearch, FaMusic, FaPlay, FaRandom, FaCompactDisc } from 'react-icons/fa';

export default function SongsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'title' | 'artist'>('default');
  const { setCurrentSong, setQueue } = usePlayerStore();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const fetchAllDocuments = async (collectionId: string): Promise<any[]> => {
    const allDocs: any[] = [];
    let offset = 0;
    while (true) {
      const response = await databases.listDocuments(DATABASE_ID, collectionId, [
        Query.limit(100),
        Query.offset(offset),
      ]);
      allDocs.push(...response.documents);
      if (allDocs.length >= response.total) break;
      offset += 100;
    }
    return allDocs;
  };

  const loadData = async () => {
    try {
      const [songsDocs, albumsDocs] = await Promise.allSettled([
        fetchAllDocuments(SONGS_COLLECTION_ID),
        fetchAllDocuments(ALBUMS_COLLECTION_ID),
      ]);
      if (songsDocs.status === 'fulfilled') setSongs(songsDocs.value as unknown as Song[]);
      if (albumsDocs.status === 'fulfilled') setAlbums(albumsDocs.value as unknown as Album[]);
    } catch (error) {
      console.error('Failed to load songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSongs = useMemo(() => {
    let result = songs.filter(
      (song) =>
        song.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortBy === 'title') {
      result = [...result].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'artist') {
      result = [...result].sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
    }

    return result;
  }, [songs, searchQuery, sortBy]);

  const playAll = () => {
    if (filteredSongs.length > 0) {
      setQueue(filteredSongs);
      setCurrentSong(filteredSongs[0]);
    }
  };

  const playShuffle = () => {
    if (filteredSongs.length > 0) {
      const shuffled = [...filteredSongs].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      setCurrentSong(shuffled[0]);
    }
  };

  const getAlbumName = (albumId: string) => {
    if (!albumId) return '';
    return albums.find(a => a.$id === albumId)?.title || '';
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

  return (
    <div className="flex min-h-screen bg-[#0d0d14]">
      <Sidebar />
      <main className="flex-1 pb-[140px] lg:pb-28 min-w-0">
        <MobileHeader />

        {/* Header Section */}
        <div className="px-4 sm:px-8 pt-4 sm:pt-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">All Songs</h1>
              <p className="text-gray-400 text-sm mt-1">{songs.length} songs in library</p>
            </div>
            {songs.length > 0 && (
              <div className="flex gap-2">
                <button onClick={playAll}
                  className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 rounded-xl font-semibold transition-all text-sm text-black">
                  <FaPlay className="text-xs" />Play All
                </button>
                <button onClick={playShuffle}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] rounded-xl font-semibold transition-all text-sm">
                  <FaRandom />Shuffle
                </button>
              </div>
            )}
          </div>

          {/* Search + Sort */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search songs or artists..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.04] rounded-full focus:outline-none focus:border-teal-500/50 text-white placeholder-gray-500 text-sm"
              />
            </div>
            <div className="flex gap-1.5">
              {[
                { key: 'default' as const, label: 'Default' },
                { key: 'title' as const, label: 'Title' },
                { key: 'artist' as const, label: 'Artist' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    sortBy === opt.key
                      ? 'bg-teal-500 text-black'
                      : 'bg-white/[0.04] text-gray-400 hover:text-white border border-white/[0.04]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Songs Count */}
        {searchQuery && (
          <div className="px-4 sm:px-8 pb-2">
            <p className="text-xs text-gray-500">
              {filteredSongs.length} result{filteredSongs.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
            </p>
          </div>
        )}

        {/* Songs List */}
        <div className="px-2 sm:px-4">
          {filteredSongs.length === 0 ? (
            <div className="text-center py-16 sm:py-20">
              <FaMusic className="text-4xl sm:text-5xl text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-400 mb-2">
                {searchQuery ? 'No songs found' : 'No songs yet'}
              </h3>
              <p className="text-gray-500 text-sm max-w-xs mx-auto">
                {searchQuery ? 'Try a different search term' : 'Add some music from the admin panel to get started'}
              </p>
              {!searchQuery && (
                <button onClick={() => router.push('/admin')}
                  className="mt-4 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 rounded-xl font-semibold transition-all text-sm text-black">
                  Go to Admin
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Album sections (grouped view on desktop) */}
              {sortBy === 'default' && albums.length > 0 && (
                <div className="hidden lg:block px-4 mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {albums.slice(0, 4).map((album) => {
                      const albumSongs = songs.filter(s => s.albumId === album.$id);
                      if (albumSongs.length === 0) return null;
                      return (
                        <button
                          key={album.$id}
                          onClick={() => { setQueue(albumSongs); setCurrentSong(albumSongs[0]); }}
                          className="flex items-center gap-3 p-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-all text-left"
                        >
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-teal-600/10 flex-shrink-0 flex items-center justify-center">
                            {album.coverImage ? (
                              <img src={album.coverImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FaCompactDisc className="text-teal-400/40 text-lg" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{album.title}</p>
                            <p className="text-xs text-gray-500">{albumSongs.length} songs</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Song list */}
              <div className="space-y-0.5">
                {filteredSongs.map((song, index) => (
                  <SongCard key={song.$id} song={song} songs={filteredSongs} index={index} />
                ))}
              </div>
            </>
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
