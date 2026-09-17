import MainPage from "@/components/MainPage";
import { getPayload } from "payload";
import configPromise from "@payload-config";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import type { Story } from "../../../../../payload-types";

export const dynamic = "force-dynamic";

interface StoryPageProps {
  params: Promise<{ slug: string }>;
}

function extractExcerpt(content: unknown): string {
  const root = (content as { root?: { children?: unknown[] } })?.root;
  if (!root?.children || !Array.isArray(root.children)) return "";

  let text = "";
  for (const child of root.children as { children?: { text?: string }[] }[]) {
    if (child.children && Array.isArray(child.children)) {
      for (const grandChild of child.children) {
        if (grandChild.text) {
          text += grandChild.text + " ";
        }
      }
    }
    if (text.length > 180) break;
  }
  return text.trim().slice(0, 160) + (text.length > 160 ? "..." : "");
}

function findMatchingStory(stories: Story[], slug: string): Story | undefined {
  const normalized = decodeURIComponent(slug).toLowerCase().trim();
  return stories.find(
    (s) =>
      s.slug?.toLowerCase() === normalized ||
      String(s.id) === normalized ||
      s.slug?.toLowerCase().endsWith(`-${normalized}`)
  );
}

export async function generateMetadata({
  params,
}: StoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const payload = await getPayload({ config: configPromise });
    const result = await payload.find({
      collection: "stories",
      where: {
        status: {
          equals: "published",
        },
      },
      sort: "-publishedDate",
      limit: 100,
    });

    const story = findMatchingStory(result.docs, slug);
    if (story) {
      const excerpt = extractExcerpt(story.content);
      const title = `${story.title} | Truman Chipotle`;
      const description = excerpt || `Read ${story.title} on Truman Chipotle`;
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `/stories/${story.slug}`,
          type: "article",
        },
      };
    }
  } catch (error) {
    console.error("Error generating metadata for story:", error);
  }

  return {
    title: "Truman Chipotle",
  };
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { slug } = await params;

  let storyChapters: Story[] = [];
  try {
    const payload = await getPayload({ config: configPromise });
    const result = await payload.find({
      collection: "stories",
      where: {
        status: {
          equals: "published",
        },
      },
      sort: "-publishedDate",
      limit: 100,
    });
    storyChapters = result.docs;
  } catch (error) {
    console.error("Error fetching story chapters from Payload:", error);
  }

  const matchedStory = findMatchingStory(storyChapters, slug);
  if (!matchedStory) {
    notFound();
  }

  return (
    <MainPage
      key={matchedStory.slug}
      storyChapters={storyChapters}
      initialSlug={matchedStory.slug}
    />
  );
}
