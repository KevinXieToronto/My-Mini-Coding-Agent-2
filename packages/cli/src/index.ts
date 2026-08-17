// packages/cli/src/index.ts
import { createElement } from 'react';
import { render } from 'ink';
import { Config } from '@minicode/core';
import { parseArgs } from './args.js';
import { App } from './ui/App.js';

const args = await parseArgs();
let config: Config;
try {
  config = await Config.load(process.cwd(), args);
  config.createProvider(); // fail fast: catches bad profile / missing key now
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}

render(createElement(App, { config }));
