// packages/cli/src/index.ts
import * as readline from 'node:readline/promises';
import {
  buildSystemPrompt,
  OpenAIProvider,
  VERSION,
  type Message,
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
  const provider = new OpenAIProvider({
    apiKey: cfg.apiKey,
    baseUrl: cfg.baseUrl,
  });

  const history: Message[] = [
    { role: 'system', content: buildSystemPrompt(process.cwd()) },
  ];

  console.log(`Mini Code v${VERSION} — model: ${cfg.model}`);
  console.log('Type your message. "exit" quits.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  for (;;) {
    const input = (await rl.question('you › ')).trim();
    if (!input) continue;
    if (input === 'exit' || input === 'quit') break;

    history.push({ role: 'user', content: input });

    process.stdout.write('minicode › ');
    let assistantText = '';
    try {
      for await (const event of provider.chat(history, { model: cfg.model })) {
        if (event.type === 'text') {
          assistantText += event.text;
          process.stdout.write(event.text);
        }
      }
      process.stdout.write('\n\n');
      history.push({ role: 'assistant', content: assistantText });
    } catch (err) {
      process.stdout.write('\n');
      console.error(
        `[error] ${err instanceof Error ? err.message : String(err)}\n`,
      );
      // Drop the failed user turn so history stays consistent.
      history.pop();
    }
  }

  rl.close();
}

await main();
