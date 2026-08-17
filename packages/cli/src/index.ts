// packages/cli/src/index.ts
import * as readline from 'node:readline/promises';
import {
  Agent,
  createDefaultRegistry,
  OpenAIProvider,
  VERSION,
} from '@minicode/core';

function envConfig(): { apiKey: string; baseUrl?: string; model: string } {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) {
    console.error('Error: set the OPENAI_API_KEY environment variable first.');
    console.error('  cmd.exe     : set OPENAI_API_KEY=sk-...');
    console.error('  PowerShell  : $env:OPENAI_API_KEY="sk-..."');
    process.exit(1);
  }
  return {
    apiKey,
    baseUrl: process.env['OPENAI_BASE_URL'],
    model: process.env['MINICODE_MODEL'] ?? 'gpt-4o-mini',
  };
}

async function main(): Promise<void> {
  const cfg = envConfig();
  const agent = new Agent({
    provider: new OpenAIProvider({ apiKey: cfg.apiKey, baseUrl: cfg.baseUrl }),
    model: cfg.model,
    tools: createDefaultRegistry(),
    cwd: process.cwd(),
  });

  console.log(`Mini Code v${VERSION} — model: ${cfg.model}`);
  console.log(`cwd: ${process.cwd()}`);
  console.log('The agent can read/write files and run commands here. "exit" quits.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  for (;;) {
    const input = (await rl.question('you › ')).trim();
    if (!input) continue;
    if (input === 'exit' || input === 'quit') break;

    let streaming = false;
    for await (const event of agent.run(input)) {
      switch (event.type) {
        case 'text':
          if (!streaming) {
            process.stdout.write('minicode › ');
            streaming = true;
          }
          process.stdout.write(event.text);
          break;
        case 'tool_start': {
          if (streaming) {
            process.stdout.write('\n');
            streaming = false;
          }
          console.log(`  ⚙ ${event.call.name} ${event.call.arguments}`);
          break;
        }
        case 'tool_end': {
          const label = event.result.displayText ?? event.call.name;
          console.log(
            event.result.isError ? `  ✗ ${label}` : `  ✓ ${label}`,
          );
          break;
        }
        case 'error':
          if (streaming) process.stdout.write('\n');
          console.error(`[error] ${event.message}`);
          streaming = false;
          break;
        case 'turn_end':
          break;
      }
    }
    if (streaming) process.stdout.write('\n');
    console.log();
  }

  rl.close();
}

await main();
