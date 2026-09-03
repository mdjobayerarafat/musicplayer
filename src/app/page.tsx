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
import { FaPlay, FaMusic, FaCompactDisc, FaHeart, FaClock, FaSearch, FaCog, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import Link from 'next/link';

type CategoryFilter = 'all' | 'trending' | 'favorites' | 'recent' | 'podcasts';

const categoryPills = [
  { id: 'cat-all', key: 'all' as CategoryFilter, label: 'All' },
  { id: 'cat-relax', key: 'trending' as CategoryFilter, label: 'Relax' },
  { id: 'cat-sad', key: 'favorites' as CategoryFilter, label: 'Sad' },
  { id: 'cat-party', key: 'recent' as CategoryFilter, label: 'Party' },
  { id: 'cat-romance', key: 'podcasts' as CategoryFilter, label: 'Romance' },
  { id: 'cat-energetic', key: 'trending' as CategoryFilter, label: 'Energetic' },
  { id: 'cat-relaxing', key: 'recent' as CategoryFilter, label: 'Relaxing' },
  { id: 'cat-jazz', key: 'favorites' as CategoryFilter, label: 'Jazz' },
  { id: 'cat-alt', key: 'podcasts' as CategoryFilter, label: 'Alternative' },
];

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { setCurrentSong, setQueue, recentlyPlayed, favorites } = usePlayerStore();

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
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const recentlyPlayedSongs = useMemo(() => {
    return recentlyPlayed.map((id) => songs.find((s) => s.$id === id)).filter(Boolean) as Song[];
  }, [recentlyPlayed, songs]);

  const favoriteSongs = useMemo(() => songs.filter((s) => favorites.includes(s.$id)), [songs, favorites]);
  const trendingSongs = useMemo(() => [...songs].sort((a, b) => (b.duration || 0) - (a.duration || 0)).slice(0, 10), [songs]);

  const filteredSongs = useMemo(() => {
    let result: Song[];
    switch (activeCategory) {
      case 'favorites': result = favoriteSongs; break;
      case 'recent': result = recentlyPlayedSongs; break;
      case 'trending': result = trendingSongs; break;
      case 'podcasts': result = []; break;
      default: result = songs;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => s.title?.toLowerCase().includes(q) || s.artist?.toLowerCase().includes(q));
    }
    return result;
  }, [activeCategory, songs, favoriteSongs, recentlyPlayedSongs, trendingSongs, searchQuery]);

  const playAll = () => {
    if (filteredSongs.length > 0) { setQueue(filteredSongs); setCurrentSong(filteredSongs[0]); }
  };

  const playShuffle = () => {
    if (filteredSongs.length > 0) {
      const shuffled = [...filteredSongs].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      setCurrentSong(shuffled[0]);
    }
  };

  const playAlbum = (album: Album) => {
    const albumSongs = songs.filter((s) => s.albumId === album.$id);
    if (albumSongs.length > 0) { setQueue(albumSongs); setCurrentSong(albumSongs[0]); }
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
        {/* Mobile Header */}
        <MobileHeader />

        {/* Desktop Top Bar */}
        <div className="hidden lg:block sticky top-0 z-30 bg-[#0d0d14]/95 backdrop-blur-xl border-b border-white/[0.03] px-8 py-3">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md flex items-center gap-2.5 px-4 py-2.5 bg-white/[0.04] border border-white/[0.04] rounded-full">
              <FaSearch className="text-gray-500 text-sm" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a song"
                className="bg-transparent outline-none text-sm text-white placeholder-gray-500 w-full"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500/30 to-teal-600/30 flex items-center justify-center ring-2 ring-teal-500/20">
                <span className="text-teal-400 text-sm font-bold">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{user.name?.split(' ')[0] || 'User'}</p>
                <p className="text-[10px] text-teal-400 font-medium">Premium</p>
              </div>
              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <FaHeart className="text-lg" />
              </button>
              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <FaCog className="text-lg" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="lg:hidden px-4 pt-3 pb-2">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.04] rounded-full">
            <FaSearch className="text-gray-500 text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a song"
              className="bg-transparent outline-none text-sm text-white placeholder-gray-500 w-full"
            />
          </div>
        </div>

        {/* Hero Section - Album Carousel */}
        {activeCategory === 'all' && albums.length > 0 && (
          <div className="px-3 sm:px-8 py-3 sm:py-6">
            <div className="relative h-[200px] sm:h-[320px] lg:h-[380px] overflow-hidden rounded-2xl sm:rounded-3xl hero-carousel">
              <div className="absolute inset-0 flex items-center justify-center">
                {albums.slice(0, 3).map((album, i) => (
                  <div
                    key={album.$id}
                    className="absolute transition-all duration-500 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl cursor-pointer"
                    style={{
                      width: i === 1 ? '60%' : '40%',
                      height: i === 1 ? '100%' : '80%',
                      zIndex: i === 1 ? 3 : 2 - i,
                      transform: `translateX(${i === 0 ? '-65%' : i === 2 ? '65%' : '0'}) scale(${i === 1 ? 1 : 0.85})`,
                      opacity: i === 1 ? 1 : 0.5,
                    }}
                    onClick={() => playAlbum(album)}
                  >
                    {album.coverImage ? (
                      <img src={album.coverImage} alt={album.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-teal-600/40 to-teal-800/40 flex items-center justify-center">
                        <FaCompactDisc className="text-teal-400/40 text-4xl sm:text-6xl" />
                      </div>
                    )}
                    {i === 1 && (
                      <div className="absolute inset-0 song-card-overlay flex items-end p-3 sm:p-6">
                        <div>
                          <h2 className="text-base sm:text-2xl lg:text-3xl font-bold mb-0.5 sm:mb-1 leading-tight">{album.title}</h2>
                          <p className="text-gray-300 text-[11px] sm:text-sm">{album.artist}</p>
                        </div>
                        <button className="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all">
                          <FaPlay className="text-white text-xs sm:text-sm ml-0.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="px-3 sm:px-8 py-2 sm:py-6">
          {/* Category Pills */}
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <h2 className="text-base sm:text-xl font-bold">Select Categories</h2>
            <div className="hidden sm:flex gap-2">
              <button className="p-1.5 text-gray-500 hover:text-white transition-colors">
                <FaChevronLeft className="text-sm" />
              </button>
              <button className="p-1.5 text-gray-500 hover:text-white transition-colors">
                <FaChevronRight className="text-sm" />
              </button>
            </div>
          </div>
          <div className="flex gap-1.5 sm:gap-2 mb-5 sm:mb-6 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            {categoryPills.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.key
                    ? 'bg-teal-500 text-black font-semibold shadow-lg shadow-teal-500/20'
                    : 'bg-white/[0.05] text-gray-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.05]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Popular Songs - Horizontal Scroll */}
          {activeCategory === 'all' && filteredSongs.length > 0 && (
            <section className="mb-6 sm:mb-8">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-base sm:text-xl font-bold">Popular songs</h2>
                <div className="hidden sm:flex gap-2">
                  <button className="p-1.5 text-gray-500 hover:text-white transition-colors">
                    <FaChevronLeft className="text-sm" />
                  </button>
                  <button className="p-1.5 text-gray-500 hover:text-white transition-colors">
                    <FaChevronRight className="text-sm" />
                  </button>
                </div>
              </div>
              <div className="flex gap-2.5 sm:gap-4 overflow-x-auto pb-3 scrollbar-hide [-webkit-overflow-scrolling:touch] -mx-1 px-1">
                {filteredSongs.slice(0, 10).map((song) => (
                  <div
                    key={song.$id}
                    onClick={() => { setQueue(filteredSongs); setCurrentSong(song); }}
                    className="group min-w-[120px] sm:min-w-[170px] md:min-w-[190px] cursor-pointer active:scale-[0.97] transition-transform"
                  >
                    <div className="aspect-square rounded-xl sm:rounded-2xl overflow-hidden mb-2 sm:mb-3 relative bg-teal-600/10">
                      {song.coverImage ? (
                        <img src={song.coverImage} alt={song.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-600/20 to-teal-800/20">
                          <FaMusic className="text-teal-400/40 text-2xl sm:text-3xl" />
                        </div>
                      )}
                      <div className="absolute inset-0 song-card-overlay opacity-0 group-hover:opacity-100 max-sm:opacity-85 transition-opacity flex items-end p-2 sm:p-3">
                        <div className="w-full flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold truncate">{song.title}</p>
                            <p className="text-[10px] sm:text-[11px] text-gray-300 truncate">{song.artist}</p>
                          </div>
                          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 ml-1.5 sm:ml-2 shadow-lg">
                            <FaPlay className="text-black text-[10px] sm:text-xs ml-0.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm font-medium truncate">{song.title}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">{song.artist}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* All Songs List */}
          {activeCategory !== 'podcasts' && (
            <section>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-base sm:text-xl font-bold">
                  {activeCategory === 'all' ? 'All Songs' :
                   activeCategory === 'favorites' ? 'Favorite Songs' :
                   activeCategory === 'recent' ? 'Recently Played' :
                   activeCategory === 'trending' ? 'Trending Songs' : 'Songs'}
                </h2>
                <span className="text-[10px] sm:text-xs text-gray-500">{filteredSongs.length} tracks</span>
              </div>

              {filteredSongs.length === 0 ? (
                <div className="text-center py-12 sm:py-20">
                  {activeCategory === 'favorites' ? (
                    <>
                      <FaHeart className="text-4xl sm:text-6xl text-gray-700 mx-auto mb-3 sm:mb-4" />
                      <h3 className="text-base sm:text-lg font-semibold text-gray-400 mb-1.5 sm:mb-2">No favorites yet</h3>
                      <p className="text-gray-500 text-xs sm:text-sm">Tap the heart icon on any song to add it to favorites</p>
                    </>
                  ) : activeCategory === 'recent' ? (
                    <>
                      <FaClock className="text-4xl sm:text-6xl text-gray-700 mx-auto mb-3 sm:mb-4" />
                      <h3 className="text-base sm:text-lg font-semibold text-gray-400 mb-1.5 sm:mb-2">No recent songs</h3>
                      <p className="text-gray-500 text-xs sm:text-sm">Songs you play will appear here</p>
                    </>
                  ) : (
                    <>
                      <FaMusic className="text-4xl sm:text-6xl text-gray-700 mx-auto mb-3 sm:mb-4" />
                      <h3 className="text-base sm:text-lg font-semibold text-gray-400 mb-1.5 sm:mb-2">No songs yet</h3>
                      <p className="text-gray-500 mb-4 sm:mb-6 text-xs sm:text-sm">Add some music from the admin panel</p>
                      <button onClick={() => router.push('/admin')}
                        className="px-5 sm:px-6 py-2.5 sm:py-3 bg-teal-500 hover:bg-teal-600 rounded-xl font-semibold transition-all shadow-lg shadow-teal-500/20 text-black text-sm">
                        Go to Admin
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredSongs.map((song, index) => (
                    <SongCard key={song.$id} song={song} songs={filteredSongs} index={index} />
                  ))}
                </div>
              )}
            </section>
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
