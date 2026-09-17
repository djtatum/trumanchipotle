import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export const formatSlug = (val: string): string =>
  val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default buildConfig({
  admin: {
    user: "users",
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    {
      slug: "users",
      auth: true,
      fields: [],
    },
    {
      slug: "stories",
      admin: {
        useAsTitle: "title",
        defaultColumns: ["title", "slug", "publishedDate", "status"],
        preview: (doc) => {
          if (doc?.slug) {
            return `/stories/${doc.slug}`;
          }
          return "/";
        },
      },
      fields: [
        {
          name: "title",
          type: "text",
          required: true,
        },
        {
          name: "slug",
          type: "text",
          required: true,
          unique: true,
          index: true,
          admin: {
            position: "sidebar",
            description: "Unique URL slug for this story (e.g. 'chapter-i-the-river-styx')",
          },
          hooks: {
            beforeValidate: [
              ({ value, data }) => {
                if (typeof value === "string" && value.trim()) {
                  return formatSlug(value);
                }
                if (data?.title && typeof data.title === "string") {
                  return formatSlug(data.title);
                }
                return value;
              },
            ],
          },
        },
        {
          name: "content",
          type: "richText",
          editor: lexicalEditor({}),
          required: true,
        },
        {
          name: "publishedDate",
          type: "date",
          required: true,
          admin: {
            position: "sidebar",
          },
          defaultValue: () => new Date().toISOString(),
        },
        {
          name: "status",
          type: "select",
          options: [
            {
              label: "Draft",
              value: "draft",
            },
            {
              label: "Published",
              value: "published",
            },
          ],
          defaultValue: "published",
          required: true,
          admin: {
            position: "sidebar",
          },
        },
      ],
    },
  ],
  editor: lexicalEditor({}),
  secret: process.env.PAYLOAD_SECRET || "a-very-secret-key-12345",
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URL || "file:./payload.db",
    },
  }),
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
});
