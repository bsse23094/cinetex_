import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

await mkdir('.angular/cache/ux', { recursive: true });
await build({
  entryPoints: ['scripts/ux-regression.test.ts'],
  outfile: '.angular/cache/ux/regression.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  tsconfig: 'tsconfig.json'
});
const result = spawnSync(process.execPath, ['--test', '.angular/cache/ux/regression.mjs'], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
