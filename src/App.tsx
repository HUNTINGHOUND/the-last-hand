import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Arena } from './components/Arena';
import { BattleLog } from './components/BattleLog';
import { Insights } from './components/Insights';
import { MissionBrief } from './components/MissionBrief';
import { PixelGlyph } from './components/PixelGlyph';
import { emptyMatch, matchVerdict, MOVES } from './game';
import type { Move } from './game';
import { useNeuralGame } from './useNeuralGame';
import { useRoundReveal } from './useRoundReveal';

export default function App() {
  const { state, phase, error, play, reset, rematch } = useNeuralGame();
  const [brief, setBrief] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetDialog = useRef<HTMLDialogElement>(null);
  const match = state.match ?? emptyMatch();
  const complete = matchVerdict(match) !== null;
  const matchHistory = state.history.filter(round => round.id > state.rounds - match.rounds);
  const latest = matchHistory.at(-1);
  const reveal = useRoundReveal(latest, phase === 'loading');
  const playMove = (move: Move) => { if (!reveal.animating) play(move); };

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || brief || confirmReset || reveal.animating) return;
    const target = event.target as HTMLElement;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return;
    const index = ['1', '2', '3'].indexOf(event.key);
    if (index !== -1) { event.preventDefault(); play(index as Move); }
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  useEffect(() => { if (confirmReset) resetDialog.current?.showModal(); }, [confirmReset]);

  return <div className="app-shell">
    <header className="site-header">
      <a className="wordmark" href={import.meta.env.BASE_URL} aria-label="The Last Hand home"><PixelGlyph /><span>THE LAST HAND</span></a>
      <span className="header-rule" aria-hidden="true" />
      <nav aria-label="Game utilities"><button onClick={() => setBrief(true)}>MISSION BRIEF</button><button className="reset-button" disabled={phase === 'loading' || phase === 'training'} onClick={() => setConfirmReset(true)}>RESET BRAIN</button></nav>
    </header>
    <main className="game-layout">
      <section className="play-section pixel-panel" aria-label="Humanity versus the overlord">
        <Arena match={match} latest={latest} reveal={reveal} phase={phase} onRematch={rematch} />
        <div className="move-controls" aria-label="Choose your move">
          {MOVES.map((move, index) => <button key={move} className="move-button" aria-label={`Play ${move.toLowerCase()}`} disabled={phase !== 'ready' || complete || reveal.animating} onClick={() => playMove(index as Move)}><PixelGlyph move={index as Move} /><span>{move.toUpperCase()} <kbd>[{index + 1}]</kbd></span></button>)}
        </div>
        {phase === 'error' ? <p className="storage-warning" role="alert">{error}</p> : null}
        {state.saveWarning ? <p className="storage-warning" role="alert">{state.saveWarning}</p> : null}
      </section>
      <Insights state={state} />
    </main>
    <BattleLog rounds={matchHistory} />
    {brief ? <MissionBrief onClose={() => setBrief(false)} /> : null}
    {confirmReset ? <dialog ref={resetDialog} aria-labelledby="reset-title" onClose={() => setConfirmReset(false)}><div className="dialog-content"><h2 id="reset-title">WIPE THE MACHINE?</h2><p>This erases its learned patterns, all scores, and the current match. Your next challenge starts with a fresh neural network.</p><div className="dialog-actions"><button className="secondary-button" onClick={() => resetDialog.current?.close()}>KEEP FIGHTING</button><button className="primary-button" onClick={() => { setConfirmReset(false); reset(); }}>RESET EVERYTHING</button></div></div></dialog> : null}
  </div>;
}
