import MainPage from "@/components/MainPage";
import { getPayload } from "payload";
import configPromise from "@payload-config";

export const dynamic = "force-dynamic";

export default async function Home() {
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

  return <MainPage storyChapters={storyChapters} />;
}

