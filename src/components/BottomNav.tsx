'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { FaHome, FaMusic, FaCompactDisc, FaPlusCircle } from 'react-icons/fa';

const navItems = [
  { href: '/', label: 'Home', icon: FaHome },
  { href: '/songs', label: 'Songs', icon: FaMusic },
  { href: '/albums', label: 'Albums', icon: FaCompactDisc },
  { href: '/admin', label: 'Admin', icon: FaPlusCircle },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#111]/95 backdrop-blur-xl border-t border-white/[0.06]">
      <div className="flex items-center justify-around px-2 py-1.5 safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px] ${
                isActive
                  ? 'text-rose-400'
                  : 'text-gray-500 active:text-white'
              }`}
            >
              <Icon className={`text-lg ${isActive ? 'drop-shadow-[0_0_6px_rgba(225,29,72,0.5)]' : ''}`} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-rose-400' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
