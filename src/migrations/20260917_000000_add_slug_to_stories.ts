import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite';

function extractShortNameSlug(title: string): string {
  if (!title) return "";
  let text = title;
  if (text.includes(":")) {
    const after = text.split(":").slice(1).join(":").trim();
    if (after) text = after;
  } else if (text.includes(" - ")) {
    const after = text.split(" - ").slice(1).join(" - ").trim();
    if (after) text = after;
  } else {
    text = text.replace(/^(?:chapter|part|transmission|act)\s+[0-9ivxlcdm]+\s*[:\-–—]?\s*/i, "").trim() || text;
  }
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const tableInfo = await db.all(sql`PRAGMA table_info(\`stories\`)`);
  const hasSlug = tableInfo.some((col: unknown) => typeof col === 'object' && col !== null && (col as { name?: string }).name === 'slug');
  if (!hasSlug) {
    await db.run(sql`ALTER TABLE \`stories\` ADD COLUMN \`slug\` text;`);
  }
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS \`stories_slug_idx\` ON \`stories\` (\`slug\`);`);

  const stories = await db.all(sql`SELECT id, title, slug FROM \`stories\``);
  for (const story of stories as { id: number; title: string; slug?: string }[]) {
    if (!story.slug || story.slug.startsWith("chapter-")) {
      const newSlug = extractShortNameSlug(story.title);
      await db.run(sql`UPDATE \`stories\` SET \`slug\` = ${newSlug} WHERE \`id\` = ${story.id}`);
    }
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX IF EXISTS \`stories_slug_idx\`;`);
}
