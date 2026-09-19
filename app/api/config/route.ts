import { getAllScenes, getTracks } from "@/lib/data";

export async function GET() {
  try {
    const [scenes, tracks] = await Promise.all([getAllScenes(), getTracks()]);
    return Response.json({
      scenes: scenes.filter((scene) => scene.isActive),
      tracks: tracks.filter((track) => track.isActive),
    });
  } catch (error) {
    console.error("Unable to load public configuration", error);
    return Response.json({ error: "স্মৃতিগুলো এখন লোড করা যাচ্ছে না।" }, { status: 500 });
  }
}
