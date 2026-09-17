import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const tableInfo = await db.all(sql`PRAGMA table_info(\`stories\`)`);
  const hasSlug = tableInfo.some((col: unknown) => typeof col === 'object' && col !== null && (col as { name?: string }).name === 'slug');
  if (!hasSlug) {
    await db.run(sql`ALTER TABLE \`stories\` ADD COLUMN \`slug\` text;`);
  }
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS \`stories_slug_idx\` ON \`stories\` (\`slug\`);`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX IF EXISTS \`stories_slug_idx\`;`);
}
