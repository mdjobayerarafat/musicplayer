'use client';

import { Song } from '@/lib/types';
import { usePlayerStore } from '@/store/playerStore';
import { FaPlay, FaPause, FaMusic, FaTrash } from 'react-icons/fa';

interface SongCardProps {
  song: Song;
  songs?: Song[];
  index?: number;
  onDelete?: (songId: string) => void;
  showDelete?: boolean;
}

export default function SongCard({ song, songs = [], index = 0, onDelete, showDelete }: SongCardProps) {
  const { currentSong, isPlaying, setCurrentSong, setQueue, togglePlay } = usePlayerStore();
  const isCurrentSong = currentSong?.$id === song.$id;

  const handlePlay = () => {
    if (isCurrentSong) {
      togglePlay();
    } else {
      setQueue(songs);
      setCurrentSong(song);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`group flex items-center gap-3 px-2 py-2.5 sm:p-3 rounded-xl transition-all hover:bg-white/[0.06] active:bg-white/[0.1] cursor-pointer ${
        isCurrentSong ? 'bg-rose-600/10' : ''
      }`}
      onClick={handlePlay}
    >
      {/* Play button / Number */}
      <div className="w-7 sm:w-9 text-center flex-shrink-0">
        {isCurrentSong && isPlaying ? (
          <div className="flex items-center justify-center gap-[2px]">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-[2.5px] bg-rose-500 rounded-full animate-pulse"
                style={{
                  height: `${10 + i * 4}px`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        ) : (
          <>
            <span className="hidden sm:inline text-xs text-gray-500 group-hover:hidden">{index + 1}</span>
            <span className="sm:hidden text-white/70">
              {isCurrentSong && isPlaying ? (
                <FaPause className="text-xs mx-auto" />
              ) : (
                <FaPlay className="text-[10px] ml-px mx-auto" />
              )}
            </span>
            <span className="hidden sm:inline group-hover:block text-white">
              {isCurrentSong && isPlaying ? <FaPause className="text-xs mx-auto" /> : <FaPlay className="text-xs ml-px mx-auto" />}
            </span>
          </>
        )}
      </div>

      {/* Cover */}
      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-rose-600/10 flex-shrink-0 flex items-center justify-center">
        {song.coverImage ? (
          <img src={song.coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <FaMusic className="text-rose-400 text-base" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] sm:text-sm font-medium truncate leading-tight ${isCurrentSong ? 'text-rose-400' : 'text-white'}`}>
          {song.title}
        </p>
        <p className="text-[11px] sm:text-xs text-gray-500 truncate mt-0.5">{song.artist}</p>
      </div>

      {/* Duration */}
      <div className="text-[11px] sm:text-xs text-gray-500 flex-shrink-0 tabular-nums">
        {formatDuration(song.duration)}
      </div>

      {/* Delete */}
      {showDelete && onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(song.$id); }}
          className="p-1.5 text-gray-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
        >
          <FaTrash className="text-xs" />
        </button>
      )}
    </div>
  );
}
