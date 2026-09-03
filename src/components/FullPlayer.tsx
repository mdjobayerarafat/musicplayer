'use client';

import { usePlayerStore } from '@/store/playerStore';
import {
  FaPlay,
  FaPause,
  FaForward,
  FaBackward,
  FaRandom,
  FaRedo,
  FaHeart,
  FaListUl,
  FaVolumeUp,
  FaVolumeMute,
  FaTimes,
  FaMusic,
} from 'react-icons/fa';
import { useEffect, useRef } from 'react';

export default function FullPlayer() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isShuffled,
    repeatMode,
    isMinimized,
    togglePlay,
    nextSong,
    prevSong,
    setVolume,
    setCurrentTime,
    toggleShuffle,
    cycleRepeat,
    setMinimized,
  } = usePlayerStore();

  const progressRef = useRef<HTMLDivElement>(null);

  if (!currentSong || isMinimized) return null;

  const thumbnailUrl = currentSong.coverImage || (currentSong.youtubeVideoId ? `https://i.ytimg.com/vi/${currentSong.youtubeVideoId}/maxresdefault.jpg` : '');

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    setCurrentTime(percentage * duration);
  };

  // Generate fake waveform bars
  const waveformBars = Array.from({ length: 50 }, (_, i) => {
    const seed = i * 0.3 + (currentSong?.$id?.charCodeAt(0) || 0) * 0.1;
    return Math.abs(Math.sin(seed) * 0.7 + Math.cos(seed * 2.3) * 0.3);
  });

  const activeBarIndex = Math.floor((currentTime / duration) * waveformBars.length);

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-rose-600/20 rounded-full blur-[150px]" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <button
          onClick={() => setMinimized(true)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <FaTimes className="text-xl" />
        </button>
        <p className="text-sm font-medium text-gray-400">Playing Now</p>
        <div className="w-9" /> {/* Spacer */}
      </div>

      {/* Album Art */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-8">
        <div className="relative">
          {/* Rotating ring */}
          <div className={`art-ring w-64 h-64 sm:w-72 sm:h-72 ${isPlaying ? 'animate-spin-slow' : 'animate-spin-slow paused'}`}>
            <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center p-4">
              <div className="w-full h-full rounded-full overflow-hidden bg-rose-600/10 flex items-center justify-center">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                    alt={currentSong.title}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <FaMusic className="text-rose-400 text-5xl" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Song Info */}
      <div className="relative z-10 text-center px-8 mb-6">
        <h2 className="text-2xl font-bold truncate">{currentSong.title}</h2>
        <p className="text-gray-400 mt-1">{currentSong.artist}</p>
      </div>

      {/* Waveform */}
      <div className="relative z-10 px-8 mb-4">
        <div
          ref={progressRef}
          className="h-16 flex items-end justify-center gap-[3px] cursor-pointer"
          onClick={handleProgressClick}
        >
          {waveformBars.map((height, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${
                i <= activeBarIndex
                  ? 'bg-rose-500'
                  : 'bg-gray-700'
              }`}
              style={{
                height: `${height * 100}%`,
                minHeight: '4px',
                opacity: i <= activeBarIndex ? 1 : 0.5,
              }}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1 px-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="relative z-10 flex items-center justify-center gap-8 px-8 pb-8">
        <button
          onClick={toggleShuffle}
          className={`p-2 transition-colors ${isShuffled ? 'text-rose-500' : 'text-gray-400 hover:text-white'}`}
        >
          <FaRandom className="text-lg" />
        </button>

        <button
          onClick={prevSong}
          className="p-2 text-white hover:text-rose-400 transition-colors"
        >
          <FaBackward className="text-xl" />
        </button>

        <button
          onClick={togglePlay}
          className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-rose-600/30"
        >
          {isPlaying ? (
            <FaPause className="text-white text-2xl" />
          ) : (
            <FaPlay className="text-white text-2xl ml-1" />
          )}
        </button>

        <button
          onClick={nextSong}
          className="p-2 text-white hover:text-rose-400 transition-colors"
        >
          <FaForward className="text-xl" />
        </button>

        <button
          onClick={cycleRepeat}
          className={`p-2 transition-colors ${repeatMode !== 'off' ? 'text-rose-500' : 'text-gray-400 hover:text-white'}`}
        >
          <FaRedo className="text-lg" />
          {repeatMode === 'one' && (
            <span className="absolute -mt-3 -ml-1 text-[10px] font-bold">1</span>
          )}
        </button>
      </div>

      {/* Volume */}
      <div className="relative z-10 flex items-center gap-3 px-8 pb-8 max-w-md mx-auto w-full">
        <button
          onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {volume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="flex-1"
        />
      </div>
    </div>
  );
}
