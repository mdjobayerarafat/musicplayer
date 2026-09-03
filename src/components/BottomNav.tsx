'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { usePlayerStore } from '@/store/playerStore';
import { FaHome, FaMusic, FaCompactDisc, FaListUl } from 'react-icons/fa';

const navItems = [
  { href: '/', label: 'Home', icon: FaHome },
  { href: '/songs', label: 'Songs', icon: FaMusic },
  { href: '/albums', label: 'Albums', icon: FaCompactDisc },
  { href: '/playlists', label: 'Lists', icon: FaListUl },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { currentSong } = usePlayerStore();

  if (!user) return null;

  return (
    <nav
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#161622]/95 backdrop-blur-xl border-t border-white/[0.04] transition-all duration-300 safe-area-bottom ${
        currentSong ? 'bottom-[60px]' : 'bottom-0'
      }`}
    >
      <div className="flex items-center justify-around px-1 py-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px] ${
                isActive
                  ? 'text-teal-400'
                  : 'text-gray-500 active:text-white'
              }`}
            >
              <Icon className={`text-lg ${isActive ? 'drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]' : ''}`} />
              <span className={`text-[9px] sm:text-[10px] font-medium ${isActive ? 'text-teal-400' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
