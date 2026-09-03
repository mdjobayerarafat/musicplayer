'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { databases, DATABASE_ID, PLAYLISTS_COLLECTION_ID } from '@/lib/appwrite';
import { Playlist } from '@/lib/types';
import {
  FaHome, FaMusic, FaListUl, FaSignOutAlt,
  FaHeart, FaSearch, FaChevronDown, FaChevronRight,
  FaUser, FaCog, FaFire, FaPodcast, FaMicrophone,
} from 'react-icons/fa';

const navItems = [
  { href: '/', label: 'Home', icon: FaHome },
  { href: '/songs', label: 'Artists', icon: FaMusic },
  { href: '/albums', label: 'Albums', icon: FaFire },
  { href: '/playlists', label: 'Playlists', icon: FaListUl },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [playlistsOpen, setPlaylistsOpen] = useState(true);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const response = await databases.listDocuments(DATABASE_ID, PLAYLISTS_COLLECTION_ID);
      setPlaylists(response.documents as unknown as Playlist[]);
    } catch (error) {
      console.error('Failed to load playlists:', error);
    }
  };

  return (
    <aside className="hidden lg:flex w-[240px] bg-[#161622] border-r border-white/[0.04] flex-col h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="p-5 pb-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <FaMusic className="text-white text-sm" />
          </div>
          <span className="text-lg font-bold">
            <span className="text-teal-400">Rhythm</span>
            <span className="text-white">Tune</span>
          </span>
        </Link>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
          <FaSearch className="text-gray-500 text-sm" />
          <input
            type="text"
            placeholder="Search for a song"
            className="bg-transparent outline-none text-sm text-white placeholder-gray-500 w-full"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mb-0.5 transition-all ${
                isActive
                  ? 'bg-teal-500/15 text-teal-400 nav-glow'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className={`text-base ${isActive ? 'text-teal-400' : ''}`} />
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}

        {/* Playlists section */}
        <div className="mt-3">
          <button
            onClick={() => setPlaylistsOpen(!playlistsOpen)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-gray-400 hover:text-white transition-all"
          >
            <div className="flex items-center gap-3">
              <FaListUl className="text-base" />
              <span className="font-medium text-sm">Playlists</span>
            </div>
            {playlistsOpen ? <FaChevronDown className="text-xs" /> : <FaChevronRight className="text-xs" />}
          </button>

          {playlistsOpen && (
            <div className="ml-4 mt-1 space-y-0.5">
              {playlists.length === 0 ? (
                <p className="text-xs text-gray-600 px-4 py-2">No playlists yet</p>
              ) : (
                playlists.slice(0, 5).map((playlist) => (
                  <Link
                    key={playlist.$id}
                    href="/playlists"
                    className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/[0.04] transition-all group"
                  >
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-teal-600/10 flex-shrink-0 flex items-center justify-center">
                      {playlist.coverImage ? (
                        <img src={playlist.coverImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FaMusic className="text-teal-400/40 text-xs" />
                      )}
                    </div>
                    <span className="text-sm text-gray-400 group-hover:text-white truncate transition-colors">
                      {playlist.name}
                    </span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-white/[0.04]">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500/30 to-teal-600/30 flex items-center justify-center ring-2 ring-teal-500/20">
            <span className="text-teal-400 text-sm font-bold">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/[0.04] text-gray-400 hover:text-white transition-all text-sm"
        >
          <FaSignOutAlt className="text-sm" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
