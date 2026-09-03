'use client';

import { Song } from '@/lib/types';
import { usePlayerStore } from '@/store/playerStore';
import { FaPlay, FaPause, FaMusic, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';

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

  const handleDelete = async () => {
    if (onDelete) {
      onDelete(song.$id);
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
      className={`group flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-white/5 ${
        isCurrentSong ? 'bg-rose-600/10' : ''
      }`}
    >
      {/* Number / Play */}
      <div className="w-10 text-center">
        {isCurrentSong && isPlaying ? (
          <div className="flex items-center justify-center gap-[2px]">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-[3px] bg-rose-500 rounded-full animate-pulse"
                style={{
                  height: `${12 + i * 4}px`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        ) : (
          <span className="text-sm text-gray-500 group-hover:hidden">{index + 1}</span>
        )}
        <button
          onClick={handlePlay}
          className="hidden group-hover:block text-white hover:text-rose-400 transition-colors mx-auto"
        >
          {isCurrentSong && isPlaying ? (
            <FaPause className="text-sm" />
          ) : (
            <FaPlay className="text-sm ml-0.5" />
          )}
        </button>
      </div>

      {/* Cover Art */}
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-rose-600/10 flex-shrink-0 flex items-center justify-center">
        {song.coverImage ? (
          <img
            src={song.coverImage}
            alt={song.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <FaMusic className="text-rose-400 text-lg" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCurrentSong ? 'text-rose-400' : 'text-white'}`}>
          {song.title}
        </p>
        <p className="text-xs text-gray-400 truncate">{song.artist}</p>
      </div>

      {/* Duration */}
      <div className="text-xs text-gray-500">
        {formatDuration(song.duration)}
      </div>

      {/* Delete */}
      {showDelete && onDelete && (
        <button
          onClick={handleDelete}
          className="p-2 text-gray-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
        >
          <FaTrash className="text-sm" />
        </button>
      )}
    </div>
  );
}
