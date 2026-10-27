import { useEffect, useRef, useState } from 'react';
import { emptyState, matchVerdict } from './game';
import type { Move, Snapshot } from './game';

export function useNeuralGame() {
  const [state, setState] = useState<Snapshot>(emptyState);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'training' | 'error'>('loading');
  const [error, setError] = useState('');
  const worker = useRef<Worker | null>(null);
  const acceptingMove = useRef(false);

  useEffect(() => {
    const instance = new Worker(new URL('./brain.worker.ts', import.meta.url), { type: 'module' });
    worker.current = instance;
    instance.onmessage = ({ data }) => {
      if (data.type === 'ready') {
        setState(data.state); setPhase('ready'); setError('');
        acceptingMove.current = !!data.state.match && !matchVerdict(data.state.match);
      } else {
        setError(data.message); setPhase('error'); acceptingMove.current = false;
      }
    };
    instance.onerror = () => {
      setError('The neural link stopped. Reload to reconnect.'); setPhase('error'); acceptingMove.current = false;
    };
    instance.postMessage({ type: 'init' });
    return () => { acceptingMove.current = false; instance.terminate(); worker.current = null; };
  }, []);

  function play(move: Move) {
    if (!acceptingMove.current) return;
    acceptingMove.current = false;
    setPhase('training');
    worker.current?.postMessage({ type: 'play', move });
  }

  function reset() {
    acceptingMove.current = false; setPhase('loading');
    worker.current?.postMessage({ type: 'reset' });
  }

  function rematch() {
    if (phase !== 'ready' || !state.match || !matchVerdict(state.match)) return;
    acceptingMove.current = false; setPhase('loading');
    worker.current?.postMessage({ type: 'rematch' });
  }

  return { state, phase, error, play, reset, rematch };
}
