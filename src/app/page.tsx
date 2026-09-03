'use client';

import { useEffect, useState, useMemo } from 'react';
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
import MobileAudioPlayer from '@/components/MobileAudioPlayer';
import BackgroundPlayback from '@/components/BackgroundPlayback';
import SongCard from '@/components/SongCard';
import { FaPlay, FaRandom, FaMusic, FaCompactDisc, FaFire, FaHeart, FaClock, FaPodcast, FaSearch } from 'react-icons/fa';
import Link from 'next/link';

type CategoryFilter = 'all' | 'trending' | 'favorites' | 'recent' | 'podcasts';

const categoryPills = [
  { key: 'trending' as CategoryFilter, label: 'Trending', icon: FaFire },
  { key: 'favorites' as CategoryFilter, label: 'Favorites', icon: FaHeart },
  { key: 'recent' as CategoryFilter, label: 'Recent', icon: FaClock },
  { key: 'podcasts' as CategoryFilter, label: 'Podcasts', icon: FaPodcast },
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

  const recentlyPlayedSongs = useMemo(() => {
    return recentlyPlayed
      .map((id) => songs.find((s) => s.$id === id))
      .filter(Boolean) as Song[];
  }, [recentlyPlayed, songs]);

  const favoriteSongs = useMemo(() => {
    return songs.filter((s) => favorites.includes(s.$id));
  }, [songs, favorites]);

  const trendingSongs = useMemo(() => {
    return [...songs].sort((a, b) => (b.duration || 0) - (a.duration || 0)).slice(0, 10);
  }, [songs]);

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
    if (albumSongs.length > 0) {
      setQueue(albumSongs);
      setCurrentSong(albumSongs[0]);
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
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-[#0f0f14]/90 backdrop-blur-xl border-b border-white/[0.03] px-5 sm:px-8 py-3">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md flex items-center gap-2.5 px-4 py-2.5 bg-white/[0.05] rounded-xl">
              <FaSearch className="text-gray-500 text-sm" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a song"
                className="bg-transparent outline-none text-sm text-white placeholder-gray-500 w-full"
              />
            </div>

            {/* User */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center ring-2 ring-amber-500/20">
                <span className="text-amber-400 text-sm font-bold">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{user.name?.split(' ')[0] || 'User'}</p>
                <p className="text-[10px] text-amber-500 font-medium">Premium</p>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section - Album Carousel */}
        {activeCategory === 'all' && albums.length > 0 && (
          <div className="px-4 sm:px-8 py-4 sm:py-6">
            <div className="relative h-[220px] sm:h-[300px] lg:h-[350px] overflow-hidden rounded-2xl sm:rounded-3xl hero-carousel">
              <div className="absolute inset-0 flex items-center justify-center">
                {albums.slice(0, 3).map((album, i) => (
                  <div
                    key={album.$id}
                    className="absolute transition-all duration-500 rounded-2xl overflow-hidden shadow-2xl"
                    style={{
                      width: i === 1 ? '65%' : '45%',
                      height: i === 1 ? '100%' : '80%',
                      zIndex: i === 1 ? 3 : 2 - i,
                      transform: `translateX(${i === 0 ? '-60%' : i === 2 ? '60%' : '0'}) scale(${i === 1 ? 1 : 0.85})`,
                      opacity: i === 1 ? 1 : 0.6,
                    }}
                    onClick={() => playAlbum(album)}
                  >
                    {album.coverImage ? (
                      <img src={album.coverImage} alt={album.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-600/40 to-orange-700/40 flex items-center justify-center">
                        <FaCompactDisc className="text-amber-400/40 text-6xl" />
                      </div>
                    )}
                    {i === 1 && (
                      <div className="absolute inset-0 song-card-overlay flex items-end p-4 sm:p-6">
                        <div>
                          <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold mb-1 leading-tight">{album.title}</h2>
                          <p className="text-gray-300 text-xs sm:text-sm">{album.artist}</p>
                        </div>
                        <button className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all">
                          <FaPlay className="text-white text-sm sm:text-base ml-0.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Welcome (no albums) */}
        {activeCategory === 'all' && albums.length === 0 && (
          <div className="px-4 sm:px-8 pt-5 sm:pt-6 pb-4">
            <h1 className="text-[22px] sm:text-4xl lg:text-5xl font-bold mb-1.5 leading-tight">
              Hello, <span className="text-amber-500">{user.name?.split(' ')[0] || 'Music Lover'}!</span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-lg">
              {songs.length} songs • {albums.length} albums
            </p>
          </div>
        )}

        <div className="px-4 sm:px-8 py-3 sm:py-6">
          {/* Category Pills */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold">Select Categories</h2>
            <FaSearch className="text-gray-500" />
          </div>
          <div className="flex gap-2 sm:gap-2.5 mb-5 sm:mb-6 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === 'all'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold shadow-lg shadow-amber-500/20'
                  : 'bg-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.1]'
              }`}
            >
              All
            </button>
            {categoryPills.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(activeCategory === cat.key ? 'all' : cat.key)}
                className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.key
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold shadow-lg shadow-amber-500/20'
                    : 'bg-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.1]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Play Controls */}
          {filteredSongs.length > 0 && (
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <button
                  onClick={playAll}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 rounded-full font-semibold transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20 text-sm text-black"
                >
                  <FaPlay className="text-xs" />
                  Play All
                </button>
                <button
                  onClick={playShuffle}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] rounded-full font-semibold transition-all text-sm"
                >
                  <FaRandom />
                  Shuffle
                </button>
              </div>
              <span className="text-xs text-gray-500">{filteredSongs.length} tracks</span>
            </div>
          )}

          {/* Podcasts placeholder */}
          {activeCategory === 'podcasts' && (
            <div className="text-center py-12 mb-6">
              <FaPodcast className="text-4xl text-gray-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-400 mb-1">Podcasts Coming Soon</h3>
              <p className="text-gray-500 text-sm">Podcast support will be available in a future update.</p>
            </div>
          )}              {/* Popular Songs - Horizontal Scroll Cards (like reference) */}
          {activeCategory === 'all' && filteredSongs.length > 0 && (
            <section className="mb-6 sm:mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold">Popular songs</h2>
              </div>
              <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide [-webkit-overflow-scrolling:touch] -mx-1 px-1">
                {filteredSongs.slice(0, 10).map((song) => (
                  <div
                    key={song.$id}
                    onClick={() => { setQueue(filteredSongs); setCurrentSong(song); }}
                    className="group min-w-[130px] sm:min-w-[160px] md:min-w-[180px] cursor-pointer active:scale-[0.97] transition-transform"
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden mb-3 relative bg-amber-600/10">
                      {song.coverImage ? (
                        <img src={song.coverImage} alt={song.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-600/20 to-orange-700/20">
                          <FaMusic className="text-amber-400/40 text-3xl" />
                        </div>
                      )}
                      <div className="absolute inset-0 song-card-overlay opacity-0 group-hover:opacity-100 max-sm:opacity-85 transition-opacity flex items-end p-2.5 sm:p-3">
                        <div className="w-full flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{song.title}</p>
                            <p className="text-[11px] text-gray-300 truncate">{song.artist}</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 ml-2 shadow-lg">
                            <FaPlay className="text-black text-xs ml-0.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-medium truncate">{song.title}</p>
                    <p className="text-xs text-gray-500 truncate">{song.artist}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Albums */}
          {activeCategory === 'all' && albums.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold">Albums</h2>
                <Link href="/albums" className="text-xs text-amber-500 hover:text-amber-400 transition-colors font-medium">
                  View All
                </Link>
              </div>
              <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide [-webkit-overflow-scrolling:touch] -mx-1 px-1">
                {albums.slice(0, 5).map((album) => (
                  <Link
                    key={album.$id}
                    href={`/albums/${album.$id}`}
                    className="group min-w-[130px] sm:min-w-[150px] md:min-w-[170px] cursor-pointer active:scale-[0.97] transition-transform"
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden mb-3 relative bg-amber-600/10">
                      {album.coverImage ? (
                        <img src={album.coverImage} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-600/20 to-orange-700/20">
                          <FaCompactDisc className="text-amber-400/40 text-3xl" />
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); playAlbum(album); }}
                        className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-lg shadow-amber-500/30"
                      >
                        <FaPlay className="text-black text-sm ml-0.5" />
                      </button>
                    </div>
                    <h3 className="font-semibold truncate text-sm">{album.title}</h3>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{album.artist}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Recently Listened */}
          {activeCategory === 'all' && recentlyPlayedSongs.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold">Recently listened</h2>
                <button
                  onClick={() => setActiveCategory('recent')}
                  className="text-xs text-amber-500 hover:text-amber-400 transition-colors font-medium"
                >
                  View All
                </button>
              </div>
              <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide [-webkit-overflow-scrolling:touch] -mx-1 px-1">
                {recentlyPlayedSongs.slice(0, 6).map((song) => (
                  <div
                    key={song.$id}
                    onClick={() => { setQueue(recentlyPlayedSongs); setCurrentSong(song); }}
                    className="group min-w-[130px] sm:min-w-[150px] cursor-pointer active:scale-[0.97] transition-transform"
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden mb-3 relative bg-amber-600/10">
                      {song.coverImage ? (
                        <img src={song.coverImage} alt={song.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-600/20 to-orange-700/20">
                          <FaMusic className="text-amber-400/40 text-3xl" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{song.title}</p>
                    <p className="text-xs text-gray-500 truncate">{song.artist}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* All Songs List (below horizontal cards) */}
          {activeCategory !== 'podcasts' && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold">
                  {activeCategory === 'all' ? 'All Songs' :
                   activeCategory === 'favorites' ? 'Favorite Songs' :
                   activeCategory === 'recent' ? 'Recently Played' :
                   activeCategory === 'trending' ? 'Trending Songs' : 'Songs'}
                </h2>
                <span className="text-xs text-gray-500">{filteredSongs.length} tracks</span>
              </div>

              {filteredSongs.length === 0 ? (
                <div className="text-center py-16 sm:py-20">
                  {activeCategory === 'favorites' ? (
                    <>
                      <FaHeart className="text-5xl sm:text-6xl text-gray-700 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-400 mb-2">No favorites yet</h3>
                      <p className="text-gray-500 text-sm">Tap the heart icon on any song to add it to favorites</p>
                    </>
                  ) : activeCategory === 'recent' ? (
                    <>
                      <FaClock className="text-5xl sm:text-6xl text-gray-700 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-400 mb-2">No recent songs</h3>
                      <p className="text-gray-500 text-sm">Songs you play will appear here</p>
                    </>
                  ) : (
                    <>
                      <FaMusic className="text-5xl sm:text-6xl text-gray-700 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-400 mb-2">No songs yet</h3>
                      <p className="text-gray-500 mb-6 text-sm">Add some music from the admin panel</p>
                      <button
                        onClick={() => router.push('/admin')}
                        className="px-6 py-3 bg-amber-500 hover:bg-amber-600 rounded-xl font-semibold transition-all shadow-lg shadow-amber-500/20 text-black"
                      >
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
