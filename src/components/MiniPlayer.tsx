'use client';

import { usePlayerStore } from '@/store/playerStore';
import { FaPlay, FaPause, FaForward, FaBackward, FaMusic } from 'react-icons/fa';

export default function MiniPlayer() {
  const {
    currentSong, isPlaying, currentTime, duration,
    togglePlay, nextSong, prevSong, setMinimized,
  } = usePlayerStore();

  if (!currentSong) return null;

  const thumbnailUrl = currentSong.coverImage || (currentSong.youtubeVideoId ? `https://i.ytimg.com/vi/${currentSong.youtubeVideoId}/mqdefault.jpg` : '');
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 slide-up">
      {/* Progress bar */}
      <div className="h-[3px] bg-white/[0.06]">
        <div className="h-full bg-amber-500 transition-all duration-200 rounded-r-full" style={{ width: `${progress}%` }} />
      </div>

      <div className="bg-[#14141e]/95 backdrop-blur-xl border-t border-white/[0.04] px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Song Info */}
          <button
            onClick={() => setMinimized(false)}
            className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 active:opacity-80 transition-opacity"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-600/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <FaMusic className="text-amber-400/60 text-sm" />
              )}
            </div>
            <div className="min-w-0 text-left">
              <p className="text-[13px] sm:text-sm font-medium truncate leading-tight">{currentSong.title}</p>
              <p className="text-[11px] sm:text-xs text-gray-400 truncate mt-0.5">{currentSong.artist}</p>
            </div>
          </button>

          {/* Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={prevSong} className="p-1.5 sm:p-2 text-gray-400 hover:text-white transition-colors">
              <FaBackward className="text-sm sm:text-base" />
            </button>

            <button
              onClick={togglePlay}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-amber-500/20"
            >
              {isPlaying ? <FaPause className="text-black text-sm" /> : <FaPlay className="text-black text-sm ml-0.5" />}
            </button>

            <button onClick={nextSong} className="p-1.5 sm:p-2 text-gray-400 hover:text-white transition-colors">
              <FaForward className="text-sm sm:text-base" />
            </button>
          </div>

          {/* Time */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-500 min-w-[80px] justify-end tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
