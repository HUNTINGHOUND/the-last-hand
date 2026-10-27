import { Brain, initializeBackend } from './brain.ts';
import { loadCheckpoint, saveCheckpoint } from './storage.ts';
import type { Move } from './game.ts';

let brain: Brain | undefined;
let busy = false;
let saveWarning: string | undefined;

async function publish() {
  if (!brain) return;
  try {
    await saveCheckpoint(brain.checkpoint());
    saveWarning = undefined;
  } catch {
    saveWarning = 'Saving is unavailable. Keep this tab open to retain your progress.';
  }
  postMessage({ type: 'ready', state: { ...brain.state, saveWarning } });
}

self.onmessage = async ({ data }: MessageEvent<{ type: 'init' | 'play' | 'reset' | 'rematch'; move?: Move }>) => {
  if (busy) return;
  busy = true;
  try {
    if (data.type === 'init') {
      await initializeBackend();
      let checkpoint;
      try { checkpoint = await loadCheckpoint(); } catch { /* Saving warning is set by publish. */ }
      if (checkpoint && checkpoint.version !== 1) throw new Error('Saved brain format is unsupported. Reset the brain to start fresh.');
      brain = new Brain(checkpoint);
      if (!brain.state.match) brain.startMatch();
      brain.commit();
    } else if (data.type === 'reset') {
      await initializeBackend();
      brain?.dispose();
      brain = new Brain();
      brain.startMatch();
      brain.commit();
    } else if (data.type === 'rematch' && brain) {
      brain.startMatch();
    } else if (data.type === 'play' && brain && data.move !== undefined) {
      await brain.play(data.move);
    }
    await publish();
  } catch (error) {
    postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Could not run the opponent.' });
  } finally { busy = false; }
};
