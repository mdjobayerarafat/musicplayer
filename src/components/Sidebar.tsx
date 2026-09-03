'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';
import {
  FaHome, FaMusic, FaCompactDisc, FaListUl, FaPlusCircle,
  FaSignOutAlt, FaUser, FaSearch, FaCog, FaHeart, FaMicrophone,
} from 'react-icons/fa';

const navItems = [
  { href: '/', label: 'Home', icon: FaHome },
  { href: '/songs', label: 'Songs', icon: FaMusic },
  { href: '/albums', label: 'Albums', icon: FaCompactDisc },
  { href: '/playlists', label: 'Playlists', icon: FaListUl },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <aside className="hidden lg:flex w-[260px] bg-[#14141e] border-r border-white/[0.04] flex-col h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="p-6 pb-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <FaMusic className="text-white text-sm" />
          </div>
          <span className="text-xl font-bold">
            <span className="text-amber-500">Free</span>
            <span className="text-white">buff</span>
          </span>
        </Link>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all ${searchFocused ? 'bg-white/[0.08] ring-1 ring-amber-500/30' : 'bg-white/[0.04]'}`}>
          <FaSearch className="text-gray-500 text-sm" />
          <input
            type="text"
            placeholder="Search for a song"
            className="bg-transparent outline-none text-sm text-white placeholder-gray-500 w-full"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all ${
                isActive
                  ? 'bg-amber-500/15 text-amber-500'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className={`text-lg ${isActive ? 'drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]' : ''}`} />
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}

        <div className="border-t border-white/[0.04] my-4 mx-2" />

        {user && (
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all ${
              pathname === '/admin'
                ? 'bg-amber-500/15 text-amber-500'
                : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <FaPlusCircle className="text-lg" />
            <span className="font-medium text-sm">Add Music</span>
          </Link>
        )}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-white/[0.04]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center ring-2 ring-amber-500/20">
            <FaUser className="text-amber-400 text-sm" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all text-sm font-medium"
        >
          <FaSignOutAlt />
          Logout
        </button>
      </div>
    </aside>
  );
}
