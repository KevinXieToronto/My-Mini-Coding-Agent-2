// esbuild.config.js
import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['packages/cli/src/index.ts'],
  outfile: 'dist/cli.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  banner: {
    js: [
      '#!/usr/bin/env node',
      // Some npm packages we add later are CommonJS and call require()
      // internally. In an ESM bundle `require` does not exist, so we
      // recreate it. This is the same shim the real project's bundle uses.
      `import { createRequire } from 'node:module';`,
      `const require = createRequire(import.meta.url);`,
      `globalThis.__filename = new URL(import.meta.url).pathname;`,
      `globalThis.__dirname = globalThis.__filename.slice(0, globalThis.__filename.lastIndexOf('/'));`,
    ].join('\n'),
  },
  logLevel: 'info',
});
