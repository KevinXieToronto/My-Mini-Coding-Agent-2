// packages/cli/src/index.ts
import { createElement } from 'react';
import { render } from 'ink';
import type { ApprovalMode } from '@minicode/core';
import { App } from './ui/App.js';
import type { RunnerConfig } from './ui/hooks/useAgentRunner.js';

function envConfig(): RunnerConfig {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) {
    console.error('Error: set the OPENAI_API_KEY environment variable first.');
    console.error('  cmd.exe     : set OPENAI_API_KEY=sk-...');
    console.error('  PowerShell  : $env:OPENAI_API_KEY="sk-..."');
    process.exit(1);
  }
  let approvalMode: ApprovalMode = 'ask';
  if (process.argv.includes('--yolo')) approvalMode = 'yolo';
  else if (process.argv.includes('--auto-edit')) approvalMode = 'auto-edit';

  return {
    apiKey,
    baseUrl: process.env['OPENAI_BASE_URL'],
    model: process.env['MINICODE_MODEL'] ?? 'gpt-4o-mini',
    approvalMode,
    cwd: process.cwd(),
  };
}

render(createElement(App, { config: envConfig() }));
