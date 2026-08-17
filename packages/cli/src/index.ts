// packages/cli/src/index.ts
import { createElement } from 'react';
import { render } from 'ink';
import { SessionStore, type Message } from '@minicode/core';
import { parseArgs } from './args.js';
import { bootstrap } from './bootstrap.js';
import { runHeadless } from './headless.js';
import { runServe } from './serve.js';
import { App } from './ui/App.js';

const args = await parseArgs();

try {
  const boot = await bootstrap(process.cwd(), args);
  for (const e of boot.mcpErrors) console.error(e);

  // ---- daemon ----
  if (args.serve) {
    runServe(boot, args.port);
  }
  // ---- headless ----
  else if (args.prompt !== undefined) {
    process.exit(await runHeadless(boot, args.prompt, args.outputFormat));
  }
  // ---- interactive (Ink) ----
  else {
    const store = new SessionStore(process.cwd());
    let sessionId: string;
    let resumedMessages: Message[] = [];
    if (args.resume !== undefined) {
      const id =
        args.resume === '' || args.resume === 'latest'
          ? await store.latestId()
          : args.resume;
      if (id === null) {
        console.error('No sessions to resume for this project.');
        process.exit(1);
      }
      resumedMessages = await store.load(id);
      sessionId = id;
    } else {
      sessionId = await store.create(process.cwd());
    }
    render(createElement(App, { boot, store, sessionId, resumedMessages }));
  }
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
