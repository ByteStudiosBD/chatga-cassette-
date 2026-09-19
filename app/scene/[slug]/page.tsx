import { ExperienceApp } from "@/app/experience-app";

export default async function ScenePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ExperienceApp initialSlug={slug} />;
}
