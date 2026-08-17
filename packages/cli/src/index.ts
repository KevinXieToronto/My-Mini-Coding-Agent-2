// packages/cli/src/index.ts
import { greet, VERSION } from '@minicode/core';

function main(): void {
  const user = process.env['USERNAME'] ?? process.env['USER'] ?? 'developer';
  console.log('┌──────────────────────────────────────────────┐');
  console.log(`│  Mini Code v${VERSION}                              │`);
  console.log('└──────────────────────────────────────────────┘');
  console.log(greet(user));
  console.log(`cwd: ${process.cwd()}`);
  console.log(`node: ${process.version}`);
}

main();
