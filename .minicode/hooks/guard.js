// .minicode/hooks/guard.js
// preToolUse hook: blocks run_shell commands that push or force-write git history.
// Protocol: payload as JSON on stdin; exit 2 blocks the call, stderr is the reason.
let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(raw);
    const command = String(payload.args?.command ?? '');
    const banned = [/git\s+push/i, /git\s+reset\s+--hard/i, /--force/i];
    for (const re of banned) {
      if (re.test(command)) {
        process.stderr.write(
          `command matches banned pattern ${re} — pushing and history rewrites are not allowed from the agent`,
        );
        process.exit(2);
      }
    }
  } catch {
    process.stderr.write('guard.js could not parse the hook payload');
    process.exit(2); // fail closed
  }
  process.exit(0);
});
