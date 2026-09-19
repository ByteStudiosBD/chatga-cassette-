import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { scenes, tracks } from "@/db/schema";
import { defaultScenes } from "./default-scenes";
import type { Scene, Track } from "./types";

export function mediaUrl(key: string | null) {
  return key ? `/api/media/${encodeURIComponent(key)}` : null;
}

export async function getAllScenes(): Promise<Scene[]> {
  const db = getDb();
  const stored = await db.select().from(scenes).orderBy(asc(scenes.sortOrder));
  const saved = new Map(stored.map((scene) => [scene.slug, scene]));
  const defaults = defaultScenes.map((scene) => ({ ...scene, ...saved.get(scene.slug) }));
  const defaultSlugs = new Set(defaultScenes.map((scene) => scene.slug));
  const custom = stored.filter((scene) => !defaultSlugs.has(scene.slug));
  return [...defaults, ...custom]
    .map((scene) => ({
      slug: scene.slug,
      title: scene.title,
      subtitle: scene.subtitle,
      imageUrl: scene.imageKey ? mediaUrl(scene.imageKey)! : scene.imageUrl,
      imageKey: scene.imageKey,
      ambienceKey: scene.ambienceKey,
      sortOrder: scene.sortOrder,
      isActive: scene.isActive,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getTracks(): Promise<Track[]> {
  const db = getDb();
  return db.select().from(tracks).orderBy(asc(tracks.sortOrder), asc(tracks.id));
}
