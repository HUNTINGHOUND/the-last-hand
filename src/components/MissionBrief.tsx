import { useEffect, useRef } from 'react';

export function MissionBrief({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} aria-labelledby="brief-title" onClose={onClose} onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }}>
    <div className="dialog-content">
      <div className="dialog-heading"><h2 id="brief-title">THE LAST HAND</h2><button onClick={() => dialog.current?.close()} aria-label="Close mission brief" className="close-button">×</button></div>
      <p className="brief-lead">The machines took our cities. Our skies. Our future.</p>
      <p>Now their overlord offers one final challenge: a hundred rounds of rock, paper, scissors. You are humanity’s champion. Stay unpredictable. Give the resistance a reason to hope.</p>
      <h3>THE TERMS</h3>
      <ul>
        <li>Play exactly <strong>100 throws</strong>. Draws count toward the 100.</li>
        <li>Win more rounds than the overlord to win the match. An equal score is a standoff.</li>
        <li>Choose with the buttons or <strong>1 / 2 / 3</strong>. The robot locks its move before yours.</li>
        <li>A rematch starts a new score. The overlord keeps what it has learned. <strong>Reset brain</strong> erases both learning and match progress.</li>
      </ul>
      <button className="primary-button" onClick={() => dialog.current?.close()}>FOR HUMANITY</button>
    </div>
  </dialog>;
}
