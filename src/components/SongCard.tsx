'use client';

import { useState, useEffect } from 'react';
import { Song, Playlist } from '@/lib/types';
import { usePlayerStore } from '@/store/playerStore';
import { databases, DATABASE_ID, PLAYLISTS_COLLECTION_ID } from '@/lib/appwrite';
import { FaPlay, FaPause, FaMusic, FaTrash, FaHeart, FaPlus, FaCheck } from 'react-icons/fa';
import toast from 'react-hot-toast';

interface SongCardProps {
  song: Song;
  songs?: Song[];
  index?: number;
  onDelete?: (songId: string) => void;
  showDelete?: boolean;
}

export default function SongCard({ song, songs = [], index = 0, onDelete, showDelete }: SongCardProps) {
  const { currentSong, isPlaying, setCurrentSong, setQueue, togglePlay, favorites, toggleFavorite } = usePlayerStore();
  const isCurrentSong = currentSong?.$id === song.$id;
  const isFav = favorites.includes(song.$id);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const handlePlay = () => {
    if (isCurrentSong) {
      togglePlay();
    } else {
      setQueue(songs);
      setCurrentSong(song);
    }
  };

  const loadPlaylists = async () => {
    try {
      const response = await databases.listDocuments(DATABASE_ID, PLAYLISTS_COLLECTION_ID);
      setPlaylists(response.documents as unknown as Playlist[]);
    } catch (error) {
      console.error('Failed to load playlists:', error);
    }
  };

  const handleAddToPlaylist = async (playlist: Playlist) => {
    try {
      const updatedSongIds = [...new Set([...(playlist.songIds || []), song.$id])];
      await databases.updateDocument(
        DATABASE_ID,
        PLAYLISTS_COLLECTION_ID,
        playlist.$id,
        { songIds: updatedSongIds }
      );
      toast.success(`Added to "${playlist.name}"`);
      setShowPlaylistMenu(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add to playlist');
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
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-white/[0.05] active:bg-white/[0.08] cursor-pointer ${
        isCurrentSong ? 'bg-amber-500/10' : ''
      }`}
      onClick={handlePlay}
    >
      {/* Play button / Number */}
      <div className="w-8 text-center flex-shrink-0">
        {isCurrentSong && isPlaying ? (
          <div className="flex items-center justify-center gap-[2px]">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-[2.5px] bg-amber-500 rounded-full animate-pulse"
                style={{
                  height: `${10 + i * 4}px`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        ) : (
          <>
            <span className="text-xs text-gray-500 group-hover:hidden">{index + 1}</span>
            <span className="hidden group-hover:block text-white">
              {isCurrentSong && isPlaying ? <FaPause className="text-xs mx-auto" /> : <FaPlay className="text-xs mx-auto" />}
            </span>
          </>
        )}
      </div>

      {/* Cover */}
      <div className="w-11 h-11 rounded-lg overflow-hidden bg-amber-600/10 flex-shrink-0 flex items-center justify-center">
        {song.coverImage ? (
          <img src={song.coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <FaMusic className="text-amber-400/60 text-base" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-medium truncate leading-tight ${isCurrentSong ? 'text-amber-500' : 'text-white'}`}>
          {song.title}
        </p>
        <p className="text-[11px] text-gray-500 truncate mt-0.5">{song.artist}</p>
      </div>

      {/* Duration */}
      <div className="text-[11px] text-gray-500 flex-shrink-0 tabular-nums hidden sm:block">
        {formatDuration(song.duration)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Favorite */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleFavorite(song.$id); }}
          className={`p-1.5 transition-colors opacity-0 group-hover:opacity-100 max-sm:opacity-70 ${
            isFav ? 'text-amber-500 opacity-100' : 'text-gray-500 hover:text-amber-400'
          }`}
        >
          <FaHeart className="text-xs" />
        </button>

        {/* Add to Playlist */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPlaylistMenu(!showPlaylistMenu);
              if (!showPlaylistMenu) loadPlaylists();
            }}
            className="p-1.5 text-gray-500 hover:text-amber-400 transition-colors opacity-0 group-hover:opacity-100 max-sm:opacity-70"
          >
            <FaPlus className="text-xs" />
          </button>

          {showPlaylistMenu && (
            <div
              className="absolute right-0 top-8 z-50 w-52 glass rounded-xl p-2 shadow-2xl shadow-black/50"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs text-gray-500 px-2 py-1">Add to playlist</p>
              {playlists.length === 0 ? (
                <p className="text-xs text-gray-400 px-2 py-2">No playlists yet</p>
              ) : (
                playlists.map((pl) => {
                  const alreadyIn = pl.songIds?.includes(song.$id);
                  return (
                    <button
                      key={pl.$id}
                      onClick={() => handleAddToPlaylist(pl)}
                      disabled={alreadyIn}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.06] transition-all text-left text-sm disabled:opacity-50"
                    >
                      {alreadyIn ? <FaCheck className="text-green-400 text-xs" /> : <FaPlus className="text-xs text-gray-500" />}
                      <span className="truncate">{pl.name}</span>
                    </button>
                  );
                })
              )}
              <button
                onClick={() => setShowPlaylistMenu(false)}
                className="w-full text-xs text-gray-500 hover:text-white px-2 py-1 mt-1"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Delete */}
        {showDelete && onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(song.$id); }}
            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          >
            <FaTrash className="text-xs" />
          </button>
        )}
      </div>
    </div>
  );
}
