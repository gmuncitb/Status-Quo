'use client';

import { useState, useMemo } from 'react';
import REGIONS from '@/lib/regions';
import CALLOUT_COLORS from '@/lib/colors';
import { NEWS_SOURCES } from '@/lib/newsSources';
import { getFlagUrl } from '@/lib/flags';

function Flag({ code, size = 18 }) {
  const url = getFlagUrl(code);
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      className="flag-icon"
      style={{
        width: size,
        height: Math.round(size * 0.7),
        objectFit: 'cover',
        borderRadius: 2,
        flexShrink: 0,
      }}
    />
  );
}

/* Collapsible section wrapper */
function Section({ label, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="ep-section">
      <button className="ep-section-toggle" onClick={() => setOpen(!open)}>
        <span className="ep-section-label">{label}</span>
        <span className={`ep-section-chevron ${open ? 'open' : ''}`}>›</span>
      </button>
      {open && <div className="ep-section-body">{children}</div>}
    </div>
  );
}

export default function EditorPanel({ activeRegion, newsItems, onNewsChange, hoveredCountry, onHoverCountry, isMinimized, onMinimizeChange, readOnly = false }) {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const region = REGIONS[activeRegion];

  // Compile full sorted list of all countries in the world for relationship mapping
  const allWorldCountries = useMemo(() => {
    const list = [];
    Object.values(REGIONS).forEach((r) => {
      r.countries.forEach((c) => {
        if (!list.some((existing) => existing.code === c.code)) {
          list.push(c);
        }
      });
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Get countries not yet added
  const availableCountries = region.countries.filter(
    (c) => !newsItems.some((item) => item.countryCode === c.code)
  );

  // Filter available countries by search
  const filteredCountries = countrySearch
    ? availableCountries.filter((c) =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase())
      )
    : availableCountries;

  const addNewsItem = () => {
    if (!selectedCountry) return;
    const country = region.countries.find((c) => c.code === selectedCountry);
    if (!country) return;

    onNewsChange([
      ...newsItems,
      {
        countryCode: country.code,
        countryName: country.name,
        newsText: '',
        color: CALLOUT_COLORS[0].hex,
      },
    ]);
    setSelectedCountry('');
  };

  const removeNewsItem = (countryCode) => {
    onNewsChange(newsItems.filter((item) => item.countryCode !== countryCode));
  };

  const updateNewsItem = (countryCode, field, value) => {
    onNewsChange(
      newsItems.map((item) =>
        item.countryCode === countryCode ? { ...item, [field]: value } : item
      )
    );
  };

  return (
    <div className={`editor-panel ${isMinimized ? 'minimized' : ''}`}>
      {/* Editor Panel Header */}
      <div className="editor-header-row">
        <div className="ep-header-left">
          <div className="ep-header-dot" />
          <h2 className="editor-title">Editor</h2>
        </div>
        <button 
          className="ep-close-btn" 
          onClick={() => onMinimizeChange(true)}
          title="Minimize Editor"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 3L3 11M3 3l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>

      <div className="editor-panel-content">
        {/* Region + Count badge */}
        <div className="ep-region-badge">
          <span className="ep-region-name">{region.name}</span>
          <span className="ep-count-badge">{newsItems.length}</span>
        </div>

        {newsItems.length === 0 ? (
          <div className="empty-state">
            <div className="ep-empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <p>No countries highlighted.<br />Click a country on the globe or select one below.</p>
          </div>
        ) : (
          <div className="news-list">
            {newsItems.map((item) => (
              <div
                className={`news-card ${hoveredCountry === item.countryCode ? 'hovered' : ''}`}
                key={item.countryCode}
                onMouseEnter={() => onHoverCountry(item.countryCode)}
                onMouseLeave={() => onHoverCountry(null)}
              >
                {/* Country header with colored left accent bar */}
                <div className="ep-card-accent" style={{ backgroundColor: item.color || '#000000' }} />
                <div className="news-card-header">
                  <span className="news-card-country">
                    <Flag code={item.countryCode} size={16} />
                    {item.countryName}
                  </span>
                  {!readOnly && (
                    <button
                      className="news-card-remove"
                      onClick={() => removeNewsItem(item.countryCode)}
                      title="Remove"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    </button>
                  )}
                </div>

                {/* News text */}
                {readOnly ? (
                  <div className="news-card-text-readonly">
                    {item.newsText || 'No news summary added.'}
                  </div>
                ) : (
                  <textarea
                    placeholder="Enter news summary..."
                    value={item.newsText}
                    onChange={(e) =>
                      updateNewsItem(item.countryCode, 'newsText', e.target.value)
                    }
                  />
                )}

                {/* Inline controls row — Color + Sources */}
                {!readOnly && (
                  <div className="ep-controls-row">
                    {/* Color swatches */}
                    <div className="ep-color-group">
                      <div 
                        className="ep-color-custom"
                        style={{ background: item.color || '#dddddd' }}
                        title="Choose custom color"
                      >
                        <input
                          type="color"
                          value={item.color && item.color.startsWith('#') && item.color.length === 7 ? item.color : '#dddddd'}
                          onChange={(e) =>
                            updateNewsItem(item.countryCode, 'color', e.target.value)
                          }
                          className="ep-color-native"
                        />
                      </div>
                      {CALLOUT_COLORS.map((c) => (
                        <div
                          key={c.id}
                          className={`ep-color-dot ${item.color === c.hex ? 'active' : ''}`}
                          style={{ backgroundColor: c.hex }}
                          title={c.label}
                          onClick={() =>
                            updateNewsItem(item.countryCode, 'color', c.hex)
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* News Sources — compact inline */}
                {!readOnly && (
                  <div className="ep-sources-row">
                    <span className="ep-sources-label">Sources</span>
                    <div className="ep-sources-selects">
                      <select
                        className="ep-source-select"
                        value={(item.newsSource || '').split(',')[0] || ''}
                        onChange={(e) => {
                          const sources = (item.newsSource || '').split(',');
                          const newSources = [e.target.value, sources[1]].filter(Boolean).join(',');
                          updateNewsItem(item.countryCode, 'newsSource', newSources);
                        }}
                      >
                        {NEWS_SOURCES.map((source) => (
                          <option key={source.name} value={source.domain}>
                            {source.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="ep-source-select"
                        value={(item.newsSource || '').split(',')[1] || ''}
                        onChange={(e) => {
                          const sources = (item.newsSource || '').split(',');
                          const newSources = [sources[0], e.target.value].filter(Boolean).join(',');
                          updateNewsItem(item.countryCode, 'newsSource', newSources);
                        }}
                      >
                        {NEWS_SOURCES.map((source) => (
                          <option key={`2-${source.name}`} value={source.domain}>
                            {source.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                {readOnly && item.newsSource && (
                  <div className="ep-sources-row">
                    <span className="ep-sources-label">Sources</span>
                    <span className="ep-sources-readonly">
                      {item.newsSource.split(',').map(domain => NEWS_SOURCES.find(s => s.domain === domain)?.name || domain).join(', ')}
                    </span>
                  </div>
                )}

                {/* Affected Relations — collapsible */}
                <Section label="Relations" defaultOpen={!!(item.affected && item.affected.length > 0)}>
                  {item.affected && item.affected.length > 0 ? (
                    <div className="affected-list">
                      {item.affected.map((rel) => (
                        <div key={rel.countryCode} className="affected-item">
                          <Flag code={rel.countryCode} size={12} />
                          <span className="ep-rel-code">{rel.countryCode}</span>
                          {readOnly ? (
                            <span className={`badge-relation-readonly ${rel.type}`} title={rel.type === 'improve' ? 'Improves Relationship' : 'Deteriorates Relationship'}>
                              {rel.type === 'improve' ? '▲' : '▼'}
                            </span>
                          ) : (
                            <>
                              <button
                                className={`btn-relation-toggle ${rel.type}`}
                                onClick={() => {
                                  const nextType = rel.type === 'improve' ? 'deteriorate' : 'improve';
                                  const updatedAffected = item.affected.map((r) =>
                                    r.countryCode === rel.countryCode ? { ...r, type: nextType } : r
                                  );
                                  updateNewsItem(item.countryCode, 'affected', updatedAffected);
                                }}
                                title={rel.type === 'improve' ? 'Click to Deteriorate' : 'Click to Improve'}
                              >
                                {rel.type === 'improve' ? '▲' : '▼'}
                              </button>
                              <button
                                className="btn-relation-remove"
                                onClick={() => {
                                  const updatedAffected = item.affected.filter((r) => r.countryCode !== rel.countryCode);
                                  updateNewsItem(item.countryCode, 'affected', updatedAffected);
                                }}
                                title="Remove Relation"
                              >
                                ×
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : readOnly ? (
                    <div className="affected-empty-readonly">No relations specified.</div>
                  ) : null}
                  
                  {!readOnly && (
                    <select
                      className="add-affected-select"
                      value=""
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const updatedAffected = [
                          ...(item.affected || []),
                          { countryCode: e.target.value, type: 'improve' },
                        ];
                        updateNewsItem(item.countryCode, 'affected', updatedAffected);
                      }}
                    >
                      <option value="">+ Add relation…</option>
                      {allWorldCountries
                        .filter((c) => c.code !== item.countryCode && !(item.affected || []).some((r) => r.countryCode === c.code))
                        .map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name} ({c.code})
                          </option>
                        ))}
                    </select>
                  )}
                </Section>
              </div>
            ))}
          </div>
        )}

        {/* Add Country — compact search + pills */}
        {!readOnly && availableCountries.length > 0 && (
          <div className="add-country-section">
            <div className="ep-add-header">
              <span className="section-title" style={{ marginBottom: 0 }}>Add Country</span>
              <input
                type="text"
                className="ep-country-search"
                placeholder="Search…"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
              />
            </div>
            <div className="country-picker">
              {filteredCountries.map((c) => (
                <button
                  key={c.code}
                  className="country-pill"
                  onClick={() => {
                    onNewsChange([
                      ...newsItems,
                      {
                        countryCode: c.code,
                        countryName: c.name,
                        newsText: '',
                        color: CALLOUT_COLORS[0].hex,
                      },
                    ]);
                    setCountrySearch('');
                  }}
                >
                  <Flag code={c.code} size={14} />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
