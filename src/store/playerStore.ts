import { create } from 'zustand';
import { Song } from '@/lib/types';

interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isShuffled: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isMinimized: boolean;
  recentlyPlayed: string[];
  favorites: string[];

  setCurrentSong: (song: Song) => void;
  setQueue: (songs: Song[]) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (songId: string) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  nextSong: () => void;
  prevSong: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setMinimized: (minimized: boolean) => void;
  clearQueue: () => void;
  addToRecentlyPlayed: (songId: string) => void;
  toggleFavorite: (songId: string) => void;
  isFavorite: (songId: string) => boolean;
}

const RECENTLY_PLAYED_KEY = 'freebuff_recently_played';
const FAVORITES_KEY = 'freebuff_favorites';
const MAX_RECENT = 50;

function loadRecentlyPlayed(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(RECENTLY_PLAYED_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveRecentlyPlayed(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(ids));
  } catch {}
}

function loadFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(FAVORITES_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveFavorites(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  } catch {}
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  queue: [],
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isShuffled: false,
  repeatMode: 'off',
  isMinimized: false,
  recentlyPlayed: loadRecentlyPlayed(),
  favorites: loadFavorites(),

  setCurrentSong: (song) => {
    set({ currentSong: song, isPlaying: true });
    get().addToRecentlyPlayed(song.$id);
  },
  setQueue: (songs) => set({ queue: songs }),
  addToQueue: (song) => set((state) => ({ queue: [...state.queue, song] })),
  removeFromQueue: (songId) => set((state) => ({
    queue: state.queue.filter((s) => s.$id !== songId),
  })),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  nextSong: () => {
    const { queue, currentSong, repeatMode } = get();
    if (queue.length === 0 || !currentSong) return;

    const currentIndex = queue.findIndex((s) => s.$id === currentSong.$id);
    let nextIndex: number;

    if (repeatMode === 'one') {
      set({ currentTime: 0, isPlaying: true });
      return;
    }

    if (currentIndex === queue.length - 1) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        set({ isPlaying: false });
        return;
      }
    } else {
      nextIndex = currentIndex + 1;
    }

    const nextSongData = queue[nextIndex];
    set({ currentSong: nextSongData, currentTime: 0, isPlaying: true });
    get().addToRecentlyPlayed(nextSongData.$id);
  },
  prevSong: () => {
    const { queue, currentSong, currentTime } = get();
    if (queue.length === 0 || !currentSong) return;

    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }

    const currentIndex = queue.findIndex((s) => s.$id === currentSong.$id);
    if (currentIndex <= 0) return;

    const prevSongData = queue[currentIndex - 1];
    set({ currentSong: prevSongData, currentTime: 0, isPlaying: true });
    get().addToRecentlyPlayed(prevSongData.$id);
  },
  toggleShuffle: () => set((state) => ({ isShuffled: !state.isShuffled })),
  cycleRepeat: () => set((state) => {
    const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(state.repeatMode);
    return { repeatMode: modes[(currentIndex + 1) % 3] };
  }),
  setMinimized: (minimized) => set({ isMinimized: minimized }),
  clearQueue: () => set({ queue: [], currentSong: null, isPlaying: false }),
  addToRecentlyPlayed: (songId: string) => {
    const current = get().recentlyPlayed;
    const updated = [songId, ...current.filter((id) => id !== songId)].slice(0, MAX_RECENT);
    set({ recentlyPlayed: updated });
    saveRecentlyPlayed(updated);
  },
  toggleFavorite: (songId: string) => {
    const current = get().favorites;
    const isFav = current.includes(songId);
    const updated = isFav
      ? current.filter((id) => id !== songId)
      : [...current, songId];
    set({ favorites: updated });
    saveFavorites(updated);
  },
  isFavorite: (songId: string) => {
    return get().favorites.includes(songId);
  },
}));
