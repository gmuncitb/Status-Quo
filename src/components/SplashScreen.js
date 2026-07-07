'use client';

import { useState, useEffect } from 'react';

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState('enter'); // 'enter' -> 'hold' -> 'exit' -> 'done'

  useEffect(() => {
    // Phase 1: Logo fades in (CSS handles this via animation)
    const holdTimer = setTimeout(() => {
      setPhase('hold');
    }, 600);

    // Phase 2: Begin exit after holding
    const exitTimer = setTimeout(() => {
      setPhase('exit');
    }, 1800);

    // Phase 3: Fully done, unmount
    const doneTimer = setTimeout(() => {
      setPhase('done');
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  if (phase === 'done') return null;

  return (
    <div className={`splash-screen splash-${phase}`}>
      <div className="splash-content">
        <img
          src="/gmunc-logo.png"
          alt="GMUNC"
          className="splash-logo"
        />
        <div className="splash-text">
          <span className="splash-title">STATUS QUO</span>
        </div>
      </div>
    </div>
  );
}
