'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { usePlayerStore } from '@/store/playerStore';
import { FaHome, FaHeart, FaListUl, FaCog } from 'react-icons/fa';

const navItems = [
  { href: '/', label: 'Home', icon: FaHome },
  { href: '/songs', label: 'Favorites', icon: FaHeart },
  { href: '/playlists', label: 'Lists', icon: FaListUl },
  { href: '/admin', label: 'Settings', icon: FaCog },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { currentSong } = usePlayerStore();

  if (!user) return null;

  return (
    <nav
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#14141e]/95 backdrop-blur-xl border-t border-white/[0.04] transition-all duration-300 ${
        currentSong ? 'bottom-[68px]' : 'bottom-0'
      }`}
    >
      <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all min-w-[60px] ${
                isActive
                  ? 'text-amber-500'
                  : 'text-gray-500 active:text-white'
              }`}
            >
              <Icon className={`text-xl ${isActive ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : ''}`} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-amber-500' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
