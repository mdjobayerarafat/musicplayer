'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { databases, DATABASE_ID, SONGS_COLLECTION_ID, PLAYLISTS_COLLECTION_ID } from '@/lib/appwrite';
import { ID } from 'appwrite';
import { Song, Playlist } from '@/lib/types';
import { usePlayerStore } from '@/store/playerStore';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import MiniPlayer from '@/components/MiniPlayer';
import FullPlayer from '@/components/FullPlayer';
import YouTubePlayer from '@/components/YouTubePlayer';
import MobileAudioPlayer from '@/components/MobileAudioPlayer';
import BackgroundPlayback from '@/components/BackgroundPlayback';
import MobileHeader from '@/components/MobileHeader';
import toast from 'react-hot-toast';
import {
  FaListUl, FaPlus, FaPlay, FaTrash, FaMusic,
  FaTimes, FaCheck, FaArrowLeft,
} from 'react-icons/fa';

export default function PlaylistsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddSongsModal, setShowAddSongsModal] = useState<Playlist | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [selectedPlaylistSongs, setSelectedPlaylistSongs] = useState<Song[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const { setCurrentSong, setQueue } = usePlayerStore();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [playlistsRes, songsRes] = await Promise.allSettled([
        databases.listDocuments(DATABASE_ID, PLAYLISTS_COLLECTION_ID),
        databases.listDocuments(DATABASE_ID, SONGS_COLLECTION_ID),
      ]);
      if (playlistsRes.status === 'fulfilled') setPlaylists(playlistsRes.value.documents as unknown as Playlist[]);
      if (songsRes.status === 'fulfilled') setSongs(songsRes.value.documents as unknown as Song[]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlaylistSongs = useCallback(async (playlist: Playlist) => {
    if (!playlist.songIds || playlist.songIds.length === 0) {
      setSelectedPlaylistSongs([]);
      return;
    }
    const playlistSongs = songs.filter((s) => playlist.songIds.includes(s.$id));
    setSelectedPlaylistSongs(playlistSongs);
  }, [songs]);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) { toast.error('Please enter a playlist name'); return; }
    setCreating(true);
    try {
      await databases.createDocument(DATABASE_ID, PLAYLISTS_COLLECTION_ID, ID.unique(), {
        name: newPlaylistName.trim(),
        description: newPlaylistDesc.trim(),
        coverImage: '',
        userId: user?.$id || '',
        songIds: [],
        createdAt: new Date().toISOString(),
      });
      toast.success('Playlist created!');
      setNewPlaylistName('');
      setNewPlaylistDesc('');
      setShowCreateModal(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create playlist');
    } finally {
      setCreating(false);
    }
  };

  const handleAddSongsToPlaylist = async (playlist: Playlist, songIds: string[]) => {
    try {
      const updatedSongIds = [...new Set([...(playlist.songIds || []), ...songIds])];
      await databases.updateDocument(DATABASE_ID, PLAYLISTS_COLLECTION_ID, playlist.$id, { songIds: updatedSongIds });
      toast.success(`Added ${songIds.length} song(s) to "${playlist.name}"`);
      setShowAddSongsModal(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add songs');
    }
  };

  const handleRemoveSongFromPlaylist = async (playlist: Playlist, songId: string) => {
    try {
      const updatedSongIds = (playlist.songIds || []).filter((id) => id !== songId);
      await databases.updateDocument(DATABASE_ID, PLAYLISTS_COLLECTION_ID, playlist.$id, { songIds: updatedSongIds });
      toast.success('Song removed from playlist');
      loadPlaylistSongs({ ...playlist, songIds: updatedSongIds });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove song');
    }
  };

  const handleDeletePlaylist = async (playlist: Playlist) => {
    if (!confirm(`Delete playlist "${playlist.name}"?`)) return;
    try {
      await databases.deleteDocument(DATABASE_ID, PLAYLISTS_COLLECTION_ID, playlist.$id);
      toast.success('Playlist deleted');
      if (selectedPlaylist?.$id === playlist.$id) { setSelectedPlaylist(null); setSelectedPlaylistSongs([]); }
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete playlist');
    }
  };

  const playPlaylist = (playlist: Playlist, playlistSongs: Song[]) => {
    if (playlistSongs.length === 0) { toast.error('Playlist is empty'); return; }
    setQueue(playlistSongs);
    setCurrentSong(playlistSongs[0]);
  };

  const viewPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    loadPlaylistSongs(playlist);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f14]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-amber-500/20 rounded-full" />
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-amber-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const inputClass = "w-full px-4 py-3 bg-white/[0.05] border border-white/[0.06] rounded-xl focus:outline-none focus:border-amber-500/50 text-white placeholder-gray-500 text-sm";

  // Playlist detail view
  if (selectedPlaylist) {
    return (
      <div className="flex min-h-screen bg-[#0f0f14]">
        <Sidebar />
        <main className="flex-1 pb-36 lg:pb-28 min-w-0">
          <MobileHeader />
          <div className="px-4 sm:px-8 pt-4 sm:pt-8 pb-6">
            <button onClick={() => { setSelectedPlaylist(null); setSelectedPlaylistSongs([]); }}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors">
              <FaArrowLeft className="text-sm" /><span className="text-sm">Playlists</span>
            </button>                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-5 mb-6">
              <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl bg-gradient-to-br from-amber-600/20 to-orange-700/20 flex items-center justify-center shadow-2xl shadow-black/50 flex-shrink-0">
                <FaListUl className="text-amber-400/30 text-5xl" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-1">Playlist</p>
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">{selectedPlaylist.name}</h1>
                {selectedPlaylist.description && <p className="text-gray-400 text-sm mb-1">{selectedPlaylist.description}</p>}
                <p className="text-gray-500 text-xs">{selectedPlaylistSongs.length} songs</p>
                <div className="flex flex-wrap gap-2 sm:gap-3 mt-4">
                  {selectedPlaylistSongs.length > 0 && (
                    <button onClick={() => playPlaylist(selectedPlaylist, selectedPlaylistSongs)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 rounded-full font-semibold transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20 text-sm text-black">
                      <FaPlay className="text-xs" />Play
                    </button>
                  )}
                  <button onClick={() => setShowAddSongsModal(selectedPlaylist)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] rounded-full font-semibold transition-all text-sm">
                    <FaPlus className="text-xs" />Add Songs
                  </button>
                  <button onClick={() => handleDeletePlaylist(selectedPlaylist)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.06] hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-full font-semibold transition-all text-sm">
                    <FaTrash className="text-xs" />Delete
                  </button>
                </div>
              </div>
            </div>

            {selectedPlaylistSongs.length === 0 ? (
              <div className="text-center py-16">
                <FaMusic className="text-5xl text-gray-700 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-400 mb-2">No songs yet</h3>
                <p className="text-gray-500 text-sm mb-4">Add songs to this playlist</p>
                <button onClick={() => setShowAddSongsModal(selectedPlaylist)}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 rounded-full font-semibold transition-all text-sm text-black">
                  Add Songs
                </button>
              </div>
            ) : (
              <div className="space-y-0.5">
                {selectedPlaylistSongs.map((song, index) => (
                  <div key={song.$id}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-white/[0.05] cursor-pointer"
                    onClick={() => { setQueue(selectedPlaylistSongs); setCurrentSong(song); }}>
                    <span className="w-8 text-center text-xs text-gray-500 flex-shrink-0">{index + 1}</span>
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-amber-600/10 flex-shrink-0 flex items-center justify-center">
                      {song.coverImage ? (<img src={song.coverImage} alt="" className="w-full h-full object-cover" />) : (<FaMusic className="text-amber-400/60 text-base" />)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{song.title}</p>
                      <p className="text-[11px] text-gray-500 truncate">{song.artist}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleRemoveSongFromPlaylist(selectedPlaylist, song.$id); }}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                      <FaTimes className="text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
        <YouTubePlayer /><MobileAudioPlayer /><BackgroundPlayback /><BottomNav /><MiniPlayer /><FullPlayer />
        {showAddSongsModal && (
          <AddSongsModal playlist={showAddSongsModal} allSongs={songs} onAdd={handleAddSongsToPlaylist} onClose={() => setShowAddSongsModal(null)} />
        )}
      </div>
    );
  }

  // Playlists list view
  return (
    <div className="flex min-h-screen bg-[#0f0f14]">
      <Sidebar />
      <main className="flex-1 pb-36 lg:pb-28 min-w-0">
        <MobileHeader />
        <div className="px-4 sm:px-8 pt-4 sm:pt-8 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Playlists</h1>
              <p className="text-gray-400 text-sm mt-1">{playlists.length} playlists</p>
            </div>
            <button onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 rounded-xl font-semibold transition-all text-sm text-black">
              <FaPlus />New Playlist
            </button>
          </div>

          {playlists.length === 0 ? (
            <div className="text-center py-16 sm:py-20">
              <FaListUl className="text-5xl sm:text-6xl text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-400 mb-2">No playlists yet</h3>
              <p className="text-gray-500 mb-6 text-sm">Create your first playlist to organize your music</p>
              <button onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 rounded-xl font-semibold transition-all shadow-lg shadow-amber-500/20 text-black">
                Create Playlist
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {playlists.map((playlist) => (
                <div key={playlist.$id}
                  className="group bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl p-3.5 transition-all cursor-pointer active:scale-[0.97]"
                  onClick={() => viewPlaylist(playlist)}>
                  <div className="aspect-square rounded-xl bg-gradient-to-br from-amber-600/15 to-orange-700/15 overflow-hidden mb-3 relative flex items-center justify-center">
                    <FaListUl className="text-amber-400/20 text-3xl" />
                    <button onClick={(e) => {
                      e.stopPropagation();
                      const playlistSongs = songs.filter((s) => playlist.songIds?.includes(s.$id));
                      playPlaylist(playlist, playlistSongs);
                    }}
                      className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-lg shadow-amber-500/30">
                      <FaPlay className="text-black text-sm ml-0.5" />
                    </button>
                  </div>
                  <h3 className="font-semibold truncate text-sm">{playlist.name}</h3>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{playlist.songIds?.length || 0} songs</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <YouTubePlayer /><MobileAudioPlayer /><BackgroundPlayback /><BottomNav /><MiniPlayer /><FullPlayer />

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">New Playlist</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white"><FaTimes /></button>
            </div>
            <div className="space-y-3">
              <input type="text" value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name *" className={inputClass} autoFocus />
              <input type="text" value={newPlaylistDesc} onChange={(e) => setNewPlaylistDesc(e.target.value)}
                placeholder="Description (optional)" className={inputClass} />
              <button onClick={handleCreatePlaylist} disabled={creating || !newPlaylistName.trim()}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-700 rounded-xl font-semibold transition-all text-black">
                {creating ? 'Creating...' : 'Create Playlist'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddSongsModal && (
        <AddSongsModal playlist={showAddSongsModal} allSongs={songs} onAdd={handleAddSongsToPlaylist} onClose={() => setShowAddSongsModal(null)} />
      )}
    </div>
  );
}

function AddSongsModal({
  playlist, allSongs, onAdd, onClose,
}: {
  playlist: Playlist; allSongs: Song[];
  onAdd: (playlist: Playlist, songIds: string[]) => void; onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const existingIds = new Set(playlist.songIds || []);
  const availableSongs = allSongs.filter(
    (s) => !existingIds.has(s.$id) && (
      s.title?.toLowerCase().includes(search.toLowerCase()) ||
      s.artist?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const toggle = (songId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) next.delete(songId); else next.add(songId);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass rounded-2xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Add to &quot;{playlist.name}&quot;</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><FaTimes /></button>
        </div>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search songs..."
          className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.06] rounded-xl focus:outline-none focus:border-amber-500/50 text-white placeholder-gray-500 mb-3 text-sm" />
        <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
          {availableSongs.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">
              {allSongs.length === 0 ? 'No songs available' : 'All songs already in playlist'}
            </p>
          ) : (
            availableSongs.map((song) => (
              <div key={song.$id} onClick={() => toggle(song.$id)}
                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${selected.has(song.$id) ? 'bg-amber-500/10' : 'hover:bg-white/[0.05]'}`}>
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selected.has(song.$id) ? 'bg-amber-500 border-amber-500' : 'border-white/20'}`}>
                  {selected.has(song.$id) && <FaCheck className="text-black text-xs" />}
                </div>
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-amber-600/10 flex-shrink-0 flex items-center justify-center">
                  {song.coverImage ? (<img src={song.coverImage} alt="" className="w-full h-full object-cover" />) : (<FaMusic className="text-amber-400/60 text-sm" />)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{song.title}</p>
                  <p className="text-xs text-gray-500 truncate">{song.artist}</p>
                </div>
              </div>
            ))
          )}
        </div>
        {selected.size > 0 && (
          <button onClick={() => onAdd(playlist, Array.from(selected))}
            className="mt-3 w-full py-3 bg-amber-500 hover:bg-amber-600 rounded-xl font-semibold transition-all text-black">
            Add {selected.size} song(s)
          </button>
        )}
      </div>
    </div>
  );
}
