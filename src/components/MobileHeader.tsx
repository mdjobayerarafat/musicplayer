'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { FaMusic } from 'react-icons/fa';

export default function MobileHeader() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="lg:hidden sticky top-0 z-30 bg-[#0f0f14]/90 backdrop-blur-xl border-b border-white/[0.03] px-4 py-3">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <FaMusic className="text-white text-xs" />
          </div>
          <span className="text-lg font-bold">
            <span className="text-amber-500">Free</span>
            <span className="text-white">buff</span>
          </span>
        </Link>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center ring-2 ring-amber-500/20">
            <span className="text-amber-400 text-xs font-bold">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
