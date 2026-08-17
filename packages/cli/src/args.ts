// packages/cli/src/args.ts
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { ApprovalMode } from '@minicode/core';

export interface CliArgs {
  model?: string;
  provider?: string;
  approvalMode: ApprovalMode;
}

export async function parseArgs(): Promise<CliArgs> {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('minicode')
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
    .help()
    .parse();

  return {
    model: argv.model,
    provider: argv.provider,
    approvalMode: argv.yolo ? 'yolo' : (argv['approval-mode'] as ApprovalMode),
  };
}
