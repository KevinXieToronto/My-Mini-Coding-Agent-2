// packages/cli/src/headless.ts
import { SessionStore } from '@minicode/core';
import type { OutputFormat } from './args.js';
import { buildAgent, type Bootstrap } from './bootstrap.js';

/** Run one prompt to completion without a UI. Returns the process exit code. */
export async function runHeadless(
  boot: Bootstrap,
  prompt: string,
  format: OutputFormat,
): Promise<number> {
  const store = new SessionStore(boot.config.cwd);
  const sessionId = await store.create(boot.config.cwd);

  // No confirm callback on purpose: in 'ask' mode, mutating calls are
  // DENIED (fail safe). Headless users opt in with --auto-edit / --yolo.
  const agent = buildAgent({
    boot,
    onMessage: (m) => void store.append(sessionId, m),
  });

  let response = '';
  let toolCalls = 0;
  let failed = false;

  for await (const event of agent.run(prompt)) {
    switch (format) {
      case 'stream-json':
        // One JSON object per line, every event — for machines.
        console.log(JSON.stringify(event));
        break;
      case 'text':
        if (event.type === 'text') process.stdout.write(event.text);
        else if (event.type === 'tool_start')
          process.stderr.write(`[tool] ${event.call.name}\n`);
        else if (event.type === 'error')
          process.stderr.write(`[error] ${event.message}\n`);
        break;
      case 'json':
        break; // collect below, emit once at the end
    }
    if (event.type === 'text') response += event.text;
    if (event.type === 'tool_end') toolCalls++;
    if (event.type === 'error') failed = true;
  }

  if (format === 'text') process.stdout.write('\n');
  if (format === 'json') {
    console.log(
      JSON.stringify({
        response,
        stats: { toolCalls, sessionId, model: agent.model },
        ok: !failed,
      }),
    );
  }
  return failed ? 1 : 0;
}
