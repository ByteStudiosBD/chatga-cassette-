export type Scene = {
  slug: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  imageKey: string | null;
  ambienceKey: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type Track = {
  id: number;
  title: string;
  artist: string;
  fileKey: string;
  sortOrder: number;
  isActive: boolean;
};

export type PublicConfig = {
  scenes: Scene[];
  tracks: Track[];
};
