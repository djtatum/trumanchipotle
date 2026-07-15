import MainPage from "@/components/MainPage";
import { getPayload } from "payload";
import configPromise from "@payload-config";

interface BlueskyPost {
  text: string;
  url: string;
}

async function getLatestBlueskyPost(): Promise<BlueskyPost> {
  const defaultPost: BlueskyPost = {
    text: "Me: I'M ON A BOAT!\n\nCharon, the River Styx ferryman: That song is the worst thing that ever happened to me.",
    url: "https://bsky.app/profile/trumanchipotle.com/post/3mqctuboqns2f",
  };

  try {
    const response = await fetch(
      "https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=trumanchipotle.com&limit=10",
      {
        next: { revalidate: 60 }, // Cache on server and revalidate at most every 60 seconds
      }
    );

    if (!response.ok) {
      console.warn("Failed to fetch Bluesky feed, using fallback.");
      return defaultPost;
    }

    const data = await response.json();
    const latestPostItem = data.feed?.find(
      (item: any) =>
        item.post &&
        item.post.author &&
        item.post.author.handle === "trumanchipotle.com" &&
        !item.reason
    );

    if (
      latestPostItem &&
      latestPostItem.post.record &&
      latestPostItem.post.record.text
    ) {
      const postText = latestPostItem.post.record.text;
      const postUri = latestPostItem.post.uri;

      // Extract post ID from URI
      const parts = postUri.split("/");
      const postId = parts[parts.length - 1];
      const postUrl = `https://bsky.app/profile/trumanchipotle.com/post/${postId}`;

      return {
        text: postText,
        url: postUrl,
      };
    }
  } catch (error) {
    console.error("Error fetching Bluesky post:", error);
  }

  return defaultPost;
}

export default async function Home() {
  const latestPost = await getLatestBlueskyPost();

  let storyChapters: any[] = [];
  try {
    const payload = await getPayload({ config: configPromise });
    const result = await payload.find({
      collection: "stories",
      where: {
        status: {
          equals: "published",
        },
      },
      sort: "publishedDate", // Oldest first to read the continuous story from beginning to end
      limit: 100,
    });
    storyChapters = result.docs;
  } catch (error) {
    console.error("Error fetching story chapters from Payload:", error);
  }

  return <MainPage latestPost={latestPost} storyChapters={storyChapters} />;
}
