// packages/cli/src/index.ts
import * as readline from 'node:readline/promises';
import {
  Agent,
  createDefaultRegistry,
  OpenAIProvider,
  PermissionManager,
  VERSION,
  type ApprovalMode,
  type ConfirmationRequest,
  type ConfirmOutcome,
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

function approvalModeFromArgv(): ApprovalMode {
  if (process.argv.includes('--yolo')) return 'yolo';
  if (process.argv.includes('--auto-edit')) return 'auto-edit';
  return 'ask';
}

/** Render a unified diff with +/- coloring (ANSI escape codes). */
function printDiff(diff: string): void {
  for (const line of diff.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      console.log(`\x1b[32m${line}\x1b[0m`); // green
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      console.log(`\x1b[31m${line}\x1b[0m`); // red
    } else if (line.startsWith('@@')) {
      console.log(`\x1b[36m${line}\x1b[0m`); // cyan
    } else {
      console.log(line);
    }
  }
}

async function main(): Promise<void> {
  const cfg = envConfig();
  const mode = approvalModeFromArgv();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const confirm = async (
    req: ConfirmationRequest,
  ): Promise<ConfirmOutcome> => {
    console.log(`\n┌─ approval needed ────────────────────────────`);
    console.log(`│ ${req.summary}`);
    if (req.command) console.log(`│ $ ${req.command}`);
    console.log(`└──────────────────────────────────────────────`);
    if (req.diff) printDiff(req.diff);
    for (;;) {
      const answer = (
        await rl.question('Allow? [y]es / [a]lways for this tool / [n]o › ')
      )
        .trim()
        .toLowerCase();
      if (answer === 'y' || answer === 'yes') return 'yes';
      if (answer === 'a' || answer === 'always') return 'yes-always';
      if (answer === 'n' || answer === 'no') return 'no';
    }
  };

  const agent = new Agent({
    provider: new OpenAIProvider({ apiKey: cfg.apiKey, baseUrl: cfg.baseUrl }),
    model: cfg.model,
    tools: createDefaultRegistry(),
    cwd: process.cwd(),
    permissions: new PermissionManager(mode),
    confirm,
  });

  console.log(`Mini Code v${VERSION} — model: ${cfg.model} — mode: ${mode}`);
  console.log(`cwd: ${process.cwd()}`);
  console.log('"exit" quits.\n');

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
        case 'tool_start':
          if (streaming) {
            process.stdout.write('\n');
            streaming = false;
          }
          console.log(`  ⚙ ${event.call.name}`);
          break;
        case 'tool_end': {
          const label = event.result.displayText ?? event.call.name;
          console.log(event.result.isError ? `  ✗ ${label}` : `  ✓ ${label}`);
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
