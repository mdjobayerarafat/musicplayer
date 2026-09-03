'use client';

import { usePlayerStore } from '@/store/playerStore';
import { FaPlay, FaPause, FaForward, FaBackward, FaMusic } from 'react-icons/fa';

export default function MiniPlayer() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    nextSong,
    prevSong,
    setMinimized,
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
      <div className="h-1 bg-gray-800">
        <div
          className="h-full bg-rose-500 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="bg-[#111] border-t border-white/10 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Song Info */}
          <button
            onClick={() => setMinimized(false)}
            className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            <div className="w-12 h-12 rounded-lg bg-rose-600/20 flex items-center justify-center overflow-hidden flex-shrink-0">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <FaMusic className="text-rose-400" />
              )}
            </div>
            <div className="min-w-0 text-left">
              <p className="text-sm font-medium truncate">{currentSong.title}</p>
              <p className="text-xs text-gray-400 truncate">{currentSong.artist}</p>
            </div>
          </button>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevSong}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <FaBackward className="text-lg" />
            </button>

            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center transition-all transform hover:scale-105"
            >
              {isPlaying ? (
                <FaPause className="text-white" />
              ) : (
                <FaPlay className="text-white ml-0.5" />
              )}
            </button>

            <button
              onClick={nextSong}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <FaForward className="text-lg" />
            </button>
          </div>

          {/* Time */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 min-w-[100px] justify-end">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
