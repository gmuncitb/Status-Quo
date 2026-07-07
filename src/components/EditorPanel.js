'use client';

import { useState, useMemo } from 'react';
import REGIONS from '@/lib/regions';
import CALLOUT_COLORS from '@/lib/colors';
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

export default function EditorPanel({ activeRegion, newsItems, onNewsChange, hoveredCountry, onHoverCountry, isMinimized, onMinimizeChange }) {
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
                  <button
                    className="news-card-remove"
                    onClick={() => removeNewsItem(item.countryCode)}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>

                <textarea
                  placeholder="Enter news summary..."
                  value={item.newsText}
                  onChange={(e) =>
                    updateNewsItem(item.countryCode, 'newsText', e.target.value)
                  }
                />

                <div className="color-picker-row">
                  {CALLOUT_COLORS.map((c) => (
                    <div
                      key={c.id}
                      className={`color-swatch ${item.color === c.hex ? 'active' : ''}`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                      onClick={() =>
                        updateNewsItem(item.countryCode, 'color', c.hex)
                      }
                    />
                  ))}
                </div>

                {/* Geopolitical Affected Relations Editor */}
                <div className="affected-section">
                  <div className="affected-title">Affected Relations</div>
                  <div className="affected-list">
                    {(item.affected || []).map((rel) => (
                      <div key={rel.countryCode} className="affected-item">
                        <Flag code={rel.countryCode} size={14} />
                        <span style={{ marginLeft: '2px', marginRight: '4px' }}>{rel.countryCode}</span>
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
                      </div>
                    ))}
                  </div>
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
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Country — grid below */}
        {availableCountries.length > 0 && (
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
