// packages/cli/src/serve.ts
import { randomUUID } from 'node:crypto';
import express from 'express';
import type { Agent, ConfirmOutcome } from '@minicode/core';
import { buildAgent, type Bootstrap } from './bootstrap.js';

interface ServerSession {
  id: string;
  agent: Agent;
  busy: boolean;
  /** Confirmation requests waiting for an answer, by confirmId. */
  pending: Map<string, (outcome: ConfirmOutcome) => void>;
  /** Live SSE connection while a message is being processed. */
  sse: express.Response | null;
}

export function runServe(boot: Bootstrap, port: number): void {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  const sessions = new Map<string, ServerSession>();

  // ---- session management ------------------------------------------------
  app.post('/sessions', (_req, res) => {
    const session: ServerSession = {
      id: randomUUID(),
      agent: null as unknown as Agent, // assigned below
      busy: false,
      pending: new Map(),
      sse: null,
    };
    session.agent = buildAgent({
      boot,
      confirm: (request) =>
        new Promise<ConfirmOutcome>((resolve) => {
          const confirmId = randomUUID();
          session.pending.set(confirmId, resolve);
          sendEvent(session, 'confirm', { confirmId, request });
        }),
    });
    sessions.set(session.id, session);
    res.json({ sessionId: session.id, model: session.agent.model });
  });

  app.get('/sessions', (_req, res) => {
    res.json({
      sessions: [...sessions.values()].map((s) => ({
        id: s.id,
        busy: s.busy,
        messages: s.agent.history.length,
      })),
    });
  });

  // ---- talk to the agent (SSE stream) -------------------------------------
  app.post('/sessions/:id/messages', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return void res.status(404).json({ error: 'no such session' });
    if (session.busy) return void res.status(409).json({ error: 'session is busy' });
    const text = String((req.body as { text?: unknown }).text ?? '');
    if (text.trim() === '') return void res.status(400).json({ error: 'text required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    session.busy = true;
    session.sse = res;

    void (async () => {
      try {
        for await (const event of session.agent.run(text)) {
          sendEvent(session, event.type, event);
        }
      } catch (err) {
        sendEvent(session, 'error', {
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        sendEvent(session, 'done', {});
        session.busy = false;
        session.sse = null;
        res.end();
      }
    })();
  });

  // ---- answer a confirmation ----------------------------------------------
  app.post('/sessions/:id/confirm', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return void res.status(404).json({ error: 'no such session' });
    const { confirmId, outcome } = req.body as {
      confirmId?: string;
      outcome?: ConfirmOutcome;
    };
    const resolve = confirmId ? session.pending.get(confirmId) : undefined;
    if (!resolve || !outcome) {
      return void res.status(400).json({ error: 'unknown confirmId or missing outcome' });
    }
    session.pending.delete(confirmId!);
    resolve(outcome);
    res.json({ ok: true });
  });

  app.listen(port, () => {
    console.log(`minicode daemon listening on http://localhost:${port}`);
    console.log(`  POST /sessions                → create a session`);
    console.log(`  POST /sessions/:id/messages   → send text, receive SSE stream`);
    console.log(`  POST /sessions/:id/confirm    → answer an approval request`);
  });
}

function sendEvent(
  session: ServerSession,
  name: string,
  data: unknown,
): void {
  if (!session.sse) return;
  session.sse.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}
