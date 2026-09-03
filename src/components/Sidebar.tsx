'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useState, useEffect } from 'react';
import {
  FaHome, FaMusic, FaCompactDisc, FaListUl, FaPlusCircle,
  FaSignOutAlt, FaUser, FaBars, FaTimes,
} from 'react-icons/fa';

const navItems = [
  { href: '/', label: 'Home', icon: FaHome },
  { href: '/songs', label: 'Songs', icon: FaMusic },
  { href: '/albums', label: 'Albums', icon: FaCompactDisc },
  { href: '/playlists', label: 'Playlists', icon: FaListUl },
  { href: '/admin', label: 'Add Music', icon: FaPlusCircle, adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navContent = (
    <>
      {/* Logo */}
      <div className="p-6 pb-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-600/30">
            <FaMusic className="text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-rose-400 to-pink-300 bg-clip-text text-transparent">
            Freebuff
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        {navItems
          .filter((item) => !item.adminOnly)
          .map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all ${
                  isActive
                    ? 'bg-rose-600/20 text-rose-400 shadow-sm shadow-rose-600/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="text-lg" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}

        {user && (
          <>
            <div className="border-t border-white/5 my-4 mx-2" />
            <p className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider">Admin</p>
            {navItems
              .filter((item) => item.adminOnly)
              .map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all ${
                      isActive
                        ? 'bg-rose-600/20 text-rose-400 shadow-sm shadow-rose-600/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="text-lg" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-600/20 flex items-center justify-center">
            <FaUser className="text-rose-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-400 hover:text-rose-400 transition-colors rounded-lg hover:bg-white/5"
            title="Sign out"
          >
            <FaSignOutAlt />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-[#111] border border-white/10 text-white hover:bg-white/10 transition-colors shadow-lg"
      >
        {mobileOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed top-0 left-0 w-64 bg-[#111] border-r border-white/5 flex flex-col h-screen z-40 transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#111] border-r border-white/5 flex-col h-screen sticky top-0 shrink-0">
        {navContent}
      </aside>
    </>
  );
}
