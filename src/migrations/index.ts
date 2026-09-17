import * as migration_20260715_152239_init from './20260715_152239_init';
import * as migration_20260917_000000_add_slug_to_stories from './20260917_000000_add_slug_to_stories';

export const migrations = [
  {
    up: migration_20260715_152239_init.up,
    down: migration_20260715_152239_init.down,
    name: '20260715_152239_init',
  },
  {
    up: migration_20260917_000000_add_slug_to_stories.up,
    down: migration_20260917_000000_add_slug_to_stories.down,
    name: '20260917_000000_add_slug_to_stories',
  },
];
