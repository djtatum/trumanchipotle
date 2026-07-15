import * as migration_20260715_152239_init from './20260715_152239_init';

export const migrations = [
  {
    up: migration_20260715_152239_init.up,
    down: migration_20260715_152239_init.down,
    name: '20260715_152239_init'
  },
];
