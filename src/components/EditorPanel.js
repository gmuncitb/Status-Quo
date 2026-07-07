'use client';

import { useState } from 'react';
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
