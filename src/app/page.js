'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { fetchGlobes, getOrCreateGlobe } from '@/lib/supabaseGlobes';
import { isSupabaseConfigured } from '@/lib/supabase';

const LandingGlobe = dynamic(() => import('@/components/LandingGlobe'), { ssr: false });

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getMonthLabel(monthId) {
  try {
    const [year, month] = monthId.split('-');
    return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
  } catch {
    return monthId;
  }
}

function isGlobeLocked(monthId) {
  const now = new Date();
  const [year, month] = monthId.split('-').map(Number);
  // The globe locks on the 5th of the NEXT month
  const lockDate = new Date(year, month, 5); // month is 0-indexed, so month (1-indexed) = next month
  return now >= lockDate;
}

function getCurrentMonthId() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function generateDefaultMonths() {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthId = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({
      month_id: monthId,
      title: getMonthLabel(monthId),
      locked: isGlobeLocked(monthId),
      isCurrent: i === 0,
    });
  }
  return months;
}

export default function LandingPage() {
  const router = useRouter();
  const [globes, setGlobes] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      if (isSupabaseConfigured()) {
        let data = await fetchGlobes();
        const currentMonthId = getCurrentMonthId();
        
        // Auto-create current month's globe if it does not exist in the database yet
        const currentExists = data.some((g) => g.month_id === currentMonthId);
        if (!currentExists) {
          const created = await getOrCreateGlobe(currentMonthId);
          if (created) {
            // Re-fetch globes to include the new one in the dataset
            data = await fetchGlobes();
          }
        }

        if (data.length > 0) {
          const enriched = data.map((g) => ({
            ...g,
            locked: isGlobeLocked(g.month_id),
            isCurrent: g.month_id === currentMonthId,
          })).filter(g => g.month_id >= '2026-07');
          setGlobes(enriched);
        } else {
          setGlobes(generateDefaultMonths().filter(g => g.month_id >= '2026-07'));
        }
      } else {
        setGlobes(generateDefaultMonths().filter(g => g.month_id >= '2026-07'));
      }
      setIsLoaded(true);
    }
    load();
  }, []);

  const handleOpenGlobe = useCallback(async (monthId) => {
    if (isSupabaseConfigured()) {
      await getOrCreateGlobe(monthId);
    }
    router.push(`/globe/${monthId}`);
  }, [router]);

  const handleCreateMonth = useCallback(async () => {
    const monthId = getCurrentMonthId();
    setCreating(true);
    if (isSupabaseConfigured()) {
      await getOrCreateGlobe(monthId);
    }
    router.push(`/globe/${monthId}`);
  }, [router]);

  return (
    <div className="landing-root">
      {/* Hero Section */}
      <section className="landing-hero">

        {/* Navigation */}
        <nav className="landing-nav">
          <div className="landing-nav-left">
            <img src="/gmunc-logo.png" alt="GMUNC" className="landing-nav-logo" />
            <span className="landing-nav-brand">GMUNC</span>
          </div>
        </nav>

        {/* Globe */}
        <div className="landing-hero-globe">
          <LandingGlobe size={720} />
        </div>

        {/* Overlay text */}
        <header className="landing-hero-content">
          <h1 className="landing-hero-title">Status Quo</h1>
          <p className="landing-hero-subtitle">
            A Monthly Macro-Recap of World Affairs
          </p>
          <p className="landing-hero-org">by GMUNC</p>
        </header>

        {/* Scroll indicator */}
        <div className="landing-scroll-indicator">
          <span>Select an Edition</span>
          <div className="landing-scroll-arrow">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v10M3 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
      </section>

      {/* Month Selector Section */}
      <section className="landing-editions">
        <div className="landing-editions-header">
          <h2>Monthly Editions</h2>
          <p>Select a month to view or edit the geopolitical recap</p>
        </div>

        <div className="landing-editions-grid">
          {globes.map((globe, idx) => {
            const locked = globe.locked;
            const isCurrent = globe.isCurrent;
            return (
              <button
                key={globe.month_id}
                className={`landing-edition-card ${isCurrent ? 'current' : ''} ${locked ? 'locked' : ''}`}
                onClick={() => handleOpenGlobe(globe.month_id)}
                style={{ animationDelay: `${idx * 80}ms` }}
                aria-label={`${locked ? 'View' : 'Edit'} ${getMonthLabel(globe.month_id)}`}
              >
                <div className="edition-card-month">
                  {getMonthLabel(globe.month_id)}
                </div>
                <div className={`edition-card-badge ${locked ? 'badge-locked' : 'badge-live'}`}>
                  {locked ? (
                    <><svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" style={{opacity: 0.5, flexShrink: 0}}><path d="M12 7V5a4 4 0 0 0-8 0v2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM6 5a2 2 0 1 1 4 0v2H6V5z"/></svg> View Only</>
                  ) : isCurrent ? (
                    <><span className="badge-dot" /> Live — Edit</>
                  ) : (
                    <><span className="badge-dot badge-dot-open" /> Open for Editing</>
                  )}
                </div>
                <div className="edition-card-action">
                  {locked ? 'View' : 'Edit'}
                </div>
              </button>
            );
          })}
        </div>

        {!globes.some((g) => g.month_id === getCurrentMonthId()) && (
          <button
            className="landing-create-btn"
            onClick={handleCreateMonth}
            disabled={creating}
          >
            + Create {getMonthLabel(getCurrentMonthId())}
          </button>
        )}
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <img src="/gmunc-logo.png" alt="GMUNC" className="landing-footer-logo" />
        <div className="landing-footer-text">
          <span>GMUNC · Status Quo · {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
