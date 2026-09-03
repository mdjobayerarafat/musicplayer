export interface Song {
  $id: string;
  $collectionId?: string;
  $databaseId?: string;
  title: string;
  artist: string;
  albumId: string;
  coverImage: string;
  audioUrl: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  duration: number;
  createdAt: string;
  isAdmin: boolean;
  lyrics: string;
}

export interface Playlist {
  $id: string;
  $collectionId?: string;
  $databaseId?: string;
  name: string;
  description: string;
  coverImage: string;
  userId: string;
  songIds: string[];
  createdAt: string;
}

export interface Album {
  $id: string;
  $collectionId?: string;
  $databaseId?: string;
  title: string;
  artist: string;
  coverImage: string;
  songCount: number;
  createdAt: string;
}

export interface User {
  $id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

export interface RecentlyPlayed {
  songId: string;
  playedAt: number;
}
