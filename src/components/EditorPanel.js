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

export default function EditorPanel({ activeRegion, newsItems, onNewsChange, hoveredCountry, onHoverCountry, isMinimized, onMinimizeChange, readOnly = false }) {
  const [selectedCountry, setSelectedCountry] = useState('');
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
      {/* Editor Panel Header (Title & Close button) */}
      <div className="editor-header-row">
        <h2 className="editor-title">Recap Editor</h2>
        <button 
          className="btn btn-close" 
          onClick={() => onMinimizeChange(true)}
          title="Minimize Editor"
        >
          ×
        </button>
      </div>

      <div className="editor-panel-content">
        {/* News Items — vertical list */}
        <div className="section-title">Highlights — {region.name} ({newsItems.length})</div>

        {newsItems.length === 0 ? (
          <div className="empty-state">
            <p>No countries highlighted.<br />Select a country below to highlight.</p>
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
                <div className="news-card-header">
                  <span className="news-card-country">
                    <Flag code={item.countryCode} size={18} />
                    {item.countryName}
                  </span>
                  {!readOnly && (
                    <button
                      className="news-card-remove"
                      onClick={() => removeNewsItem(item.countryCode)}
                      title="Remove"
                    >
                      ×
                    </button>
                  )}
                </div>

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

                {!readOnly && (
                  <div className="canva-color-picker">
                    {/* Custom Canva color picker button */}
                    <div 
                      className="canva-custom-color-btn"
                      style={{ background: item.color || '#dddddd' }}
                      title="Choose custom color"
                    >
                      <span className="plus-icon">+</span>
                      <input
                        type="color"
                        value={item.color && item.color.startsWith('#') && item.color.length === 7 ? item.color : '#dddddd'}
                        onChange={(e) =>
                          updateNewsItem(item.countryCode, 'color', e.target.value)
                        }
                        className="canva-native-color-input"
                      />
                    </div>

                    {/* Preset swatches */}
                    <div className="canva-presets-row">
                      {CALLOUT_COLORS.map((c) => (
                        <div
                          key={c.id}
                          className={`canva-color-swatch ${item.color === c.hex ? 'active' : ''}`}
                          style={{ backgroundColor: c.hex }}
                          title={c.label}
                          onClick={() =>
                            updateNewsItem(item.countryCode, 'color', c.hex)
                          }
                        />
                      ))}
                    </div>

                    {/* HEX Input */}
                    <input
                      type="text"
                      className="canva-hex-input"
                      value={item.color || ''}
                      placeholder="#000000"
                      maxLength={7}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val && !val.startsWith('#')) {
                          val = '#' + val;
                        }
                        updateNewsItem(item.countryCode, 'color', val);
                      }}
                    />
                  </div>
                )}

                {/* News Source Selector */}
                {!readOnly && (
                  <div className="news-source-section" style={{ marginTop: '10px', marginBottom: '10px' }}>
                    <div className="affected-title" style={{ fontSize: '11px', fontWeight: 600, color: '#555', marginBottom: '4px', textTransform: 'uppercase' }}>News Sources</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        className="affected-select"
                        style={{ flex: 1 }}
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
                        className="affected-select"
                        style={{ flex: 1 }}
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
                  <div className="news-source-section" style={{ marginTop: '10px', marginBottom: '10px' }}>
                    <div className="affected-title" style={{ fontSize: '11px', fontWeight: 600, color: '#555', marginBottom: '4px', textTransform: 'uppercase' }}>
                      News Sources: {
                        item.newsSource.split(',').map(domain => NEWS_SOURCES.find(s => s.domain === domain)?.name || domain).join(', ')
                      }
                    </div>
                  </div>
                )}

                {/* Geopolitical Affected Relations Editor */}
                <div className="affected-section">
                  <div className="affected-title">Affected Relations</div>
                  {item.affected && item.affected.length > 0 ? (
                    <div className="affected-list">
                      {item.affected.map((rel) => (
                        <div key={rel.countryCode} className="affected-item">
                          <Flag code={rel.countryCode} size={14} />
                          <span style={{ marginLeft: '2px', marginRight: '4px' }}>{rel.countryCode}</span>
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
                                title={rel.type === 'improve' ? 'Improves Relationship (Click to Deteriorate)' : 'Deteriorates Relationship (Click to Improve)'}
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
                    <div className="affected-empty-readonly">No affected relations specified.</div>
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
                      <option value="">+ Add affected country...</option>
                      {allWorldCountries
                        .filter((c) => c.code !== item.countryCode && !(item.affected || []).some((r) => r.countryCode === c.code))
                        .map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name} ({c.code})
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Country — grid below */}
        {!readOnly && availableCountries.length > 0 && (
          <div className="add-country-section">
            <div className="section-title">Highlight Country</div>
            <div className="country-picker">
              {availableCountries.map((c) => (
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
                  }}
                >
                  <Flag code={c.code} size={16} />
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
