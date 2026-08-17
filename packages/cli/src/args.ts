// packages/cli/src/args.ts
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { ApprovalMode } from '@minicode/core';

export type OutputFormat = 'text' | 'json' | 'stream-json';

export interface CliArgs {
  model?: string;
  provider?: string;
  approvalMode: ApprovalMode;
  resume?: string;
  /** Headless: run this prompt and exit. */
  prompt?: string;
  outputFormat: OutputFormat;
  /** Daemon mode. */
  serve: boolean;
  port: number;
}

export async function parseArgs(): Promise<CliArgs> {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('minicode')
    .command('serve', 'Run the HTTP daemon (REST + SSE)', (y) =>
      y.option('port', {
        type: 'number',
        default: 8787,
        describe: 'Port to listen on',
      }),
    )
    .option('model', {
      type: 'string',
      describe: 'Model name (overrides settings)',
    })
    .option('provider', {
      type: 'string',
      describe: 'Provider profile name from settings.json',
    })
    .option('approval-mode', {
      choices: ['ask', 'auto-edit', 'yolo'] as const,
      default: 'ask' as const,
      describe: 'When to ask before mutating tools run',
    })
    .option('yolo', {
      type: 'boolean',
      default: false,
      describe: 'Shorthand for --approval-mode yolo',
    })
    .option('resume', {
      type: 'string',
      describe: 'Resume a session: --resume <id> or --resume latest',
    })
    .option('prompt', {
      alias: 'p',
      type: 'string',
      describe: 'Run one prompt non-interactively and exit',
    })
    .option('output-format', {
      choices: ['text', 'json', 'stream-json'] as const,
      default: 'text' as const,
      describe: 'Headless output format',
    })
    .help()
    .parse();

  return {
    model: argv.model,
    provider: argv.provider,
    approvalMode: argv.yolo ? 'yolo' : (argv['approval-mode'] as ApprovalMode),
    resume: argv.resume,
    prompt: argv.prompt,
    outputFormat: argv['output-format'] as OutputFormat,
    serve: argv._.includes('serve'),
    port: (argv as { port?: number }).port ?? 8787,
  };
}
