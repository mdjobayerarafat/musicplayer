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

  setCurrentSong: (song) => set({ currentSong: song, isPlaying: true }),
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

    set({ currentSong: queue[nextIndex], currentTime: 0, isPlaying: true });
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

    set({ currentSong: queue[currentIndex - 1], currentTime: 0, isPlaying: true });
  },
  toggleShuffle: () => set((state) => ({ isShuffled: !state.isShuffled })),
  cycleRepeat: () => set((state) => {
    const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(state.repeatMode);
    return { repeatMode: modes[(currentIndex + 1) % 3] };
  }),
  setMinimized: (minimized) => set({ isMinimized: minimized }),
  clearQueue: () => set({ queue: [], currentSong: null, isPlaying: false }),
}));
