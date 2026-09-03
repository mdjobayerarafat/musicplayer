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
