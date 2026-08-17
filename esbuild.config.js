// esbuild.config.js
import esbuild from 'esbuild';

/** Replace an unresolvable dependency with a source stub. */
function stubModule(moduleName, source) {
  const namespace = `stub-${moduleName}`;
  return {
    name: namespace,
    setup(build) {
      const filter = new RegExp(`^${moduleName}$`);
      build.onResolve({ filter }, (args) => ({ path: args.path, namespace }));
      build.onLoad({ filter: /.*/, namespace }, () => ({
        contents: source,
        loader: 'js',
      }));
    },
  };
}

await esbuild.build({
  entryPoints: ['packages/cli/src/index.ts'],
  outfile: 'dist/cli.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // The Ink UI uses JSX; compile it with React's automatic runtime.
  jsx: 'automatic',
  // Ink's devtools module statically imports react-devtools-core, an optional
  // peer dependency we never install. Marking it external is not enough: the
  // import gets hoisted to the top of the bundle and fails at startup, so
  // resolve it to a stub instead.
  plugins: [stubModule('react-devtools-core', 'export default {};')],
  sourcemap: true,
  banner: {
    js: [
      '#!/usr/bin/env node',
      // Some npm packages we add later are CommonJS and call require()
      // internally. In an ESM bundle `require` does not exist, so we
      // recreate it. This is the same shim the real project's bundle uses.
      // esbuild renames colliding identifiers between bundled modules, but it
      // cannot see the banner, so a dependency that imports `createRequire`
      // itself (yargs-parser does) would redeclare it. Use a private alias.
      `import { createRequire as __minicodeCreateRequire } from 'node:module';`,
      `const require = __minicodeCreateRequire(import.meta.url);`,
      `globalThis.__filename = new URL(import.meta.url).pathname;`,
      `globalThis.__dirname = globalThis.__filename.slice(0, globalThis.__filename.lastIndexOf('/'));`,
    ].join('\n'),
  },
  logLevel: 'info',
});
