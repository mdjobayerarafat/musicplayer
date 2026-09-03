'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { FaMusic, FaSearch } from 'react-icons/fa';

export default function MobileHeader() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="lg:hidden sticky top-0 z-30 bg-[#0d0d14]/95 backdrop-blur-xl border-b border-white/[0.04] px-4 py-2.5 safe-area-top">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <FaMusic className="text-white text-[10px]" />
          </div>
          <span className="text-sm font-bold">
            <span className="text-teal-400">Rhythm</span>
            <span className="text-white">Tune</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/" className="p-2 text-gray-400 hover:text-white transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
            <FaSearch className="text-sm" />
          </Link>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500/30 to-teal-600/30 flex items-center justify-center ring-2 ring-teal-500/20">
            <span className="text-teal-400 text-[10px] font-bold">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
