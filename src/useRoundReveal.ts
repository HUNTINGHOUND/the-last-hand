import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Move, Round } from './game';

export const HAND_WINDUP_MS = 320;
export const HAND_REVEAL_MS = 500;
export type HandStage = 'idle' | 'windup' | 'reveal' | 'settled';
export interface HandReveal {
  stage: HandStage;
  animating: boolean;
  human: Move;
  robot: Move;
}

const motionQuery = '(prefers-reduced-motion: reduce)';
function subscribeMotion(listener: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}
const getMotion = () => window.matchMedia(motionQuery).matches;

export function useRoundReveal(latest: Round | undefined, loading: boolean): HandReveal {
  const reducedMotion = useSyncExternalStore(subscribeMotion, getMotion, () => false);
  const initialized = useRef(false);
  const previousRound = useRef<number | undefined>(undefined);
  const roundId = latest?.id;
  const [presentation, setPresentation] = useState<{ id?: number; stage: HandStage }>({ stage: 'settled' });

  useEffect(() => {
    const newRound = roundId !== previousRound.current;
    previousRound.current = roundId;
    // Restoring a checkpoint or starting a rematch should not replay an old throw.
    if (loading) {
      initialized.current = false;
      setPresentation({ id: roundId, stage: 'settled' });
      return;
    }
    if (!initialized.current || !newRound || roundId === undefined || reducedMotion) {
      initialized.current = true;
      setPresentation({ id: roundId, stage: 'settled' });
      return;
    }
    setPresentation({ id: roundId, stage: 'windup' });
    const reveal = window.setTimeout(() => setPresentation({ id: roundId, stage: 'reveal' }), HAND_WINDUP_MS);
    const settle = window.setTimeout(() => setPresentation({ id: roundId, stage: 'settled' }), HAND_REVEAL_MS);
    return () => { window.clearTimeout(reveal); window.clearTimeout(settle); };
  }, [roundId, loading, reducedMotion]);

  const stage: HandStage = !latest ? 'idle' : loading || reducedMotion ? 'settled' : presentation.id === roundId ? presentation.stage : 'windup';
  return {
    stage,
    animating: stage === 'windup' || stage === 'reveal',
    human: stage === 'windup' ? 0 : latest?.human ?? 0,
    robot: stage === 'windup' ? 0 : latest?.ai ?? 0,
  };
}
