'use client';

import { useState, useEffect } from 'react';

/**
 * Filter and sort controls for bounty list
 */
export default function BountyFilters({
  sortBy,
  setSortBy,
  selectedLanguages,
  setSelectedLanguages,
  selectedLabels,
  setSelectedLabels,
  availableLanguages,
  availableLabels,
  isMobile
}) {
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowLanguageDropdown(false);
      setShowLabelDropdown(false);
    };
    
    if (showLanguageDropdown || showLabelDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showLanguageDropdown, showLabelDropdown]);

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'highest', label: 'Highest $' },
    { value: 'deadline', label: 'Ending Soon' },
    { value: 'stars', label: 'Most ★' }
  ];

  return (
    <div className={`flex flex-wrap items-center gap-2 relative z-[100] animate-fade-in-up delay-100 ${isMobile ? 'mb-4' : 'mb-6'}`}>
      {sortOptions.map(sort => (
        <button
          key={sort.value}
          onClick={() => setSortBy(sort.value)}
          className={`pill ${sortBy === sort.value ? 'active' : ''}`}
        >
          {sort.label}
        </button>
      ))}

      {!isMobile && <div className="dropdown-divider" />}

      {availableLanguages.length > 1 && (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowLanguageDropdown(!showLanguageDropdown);
              setShowLabelDropdown(false);
            }}
            className={`dropdown ${selectedLanguages.length > 0 ? 'active' : ''}`}
            style={{
              paddingRight: selectedLanguages.length > 0 ? '32px' : '14px',
              background: selectedLanguages.length > 0 ? 'rgba(0, 130, 123, 0.12)' : undefined,
              color: selectedLanguages.length > 0 ? 'var(--color-primary)' : undefined
            }}
          >
            <span className="whitespace-nowrap">
              {selectedLanguages.length === 0 ? 'Language' : 
               selectedLanguages.length === 1 ? selectedLanguages[0] : 
               `${selectedLanguages.length} languages`}
            </span>
            {selectedLanguages.length === 0 && (
              <span className="text-[10px] opacity-60 inline-block translate-y-[1px]">▼</span>
            )}
            {selectedLanguages.length > 0 && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLanguages([]);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-transparent text-primary text-base cursor-pointer flex items-center justify-center transition-all font-semibold leading-none hover:bg-primary/20"
              >
                ×
              </span>
            )}
          </button>
          
          {showLanguageDropdown && (
            <div onClick={(e) => e.stopPropagation()} className="dropdown-menu">
              {availableLanguages.filter(l => l !== 'all').map(lang => {
                const isSelected = selectedLanguages.includes(lang);
                return (
                  <button
                    key={lang}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLanguages(prev => 
                        isSelected 
                          ? prev.filter(l => l !== lang)
                          : [...prev, lang]
                      );
                    }}
                    className={`dropdown-item ${isSelected ? 'selected' : ''}`}
                  >
                    {lang}
                    {isSelected && <span className="text-[11px]">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {availableLabels.length > 1 && (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowLabelDropdown(!showLabelDropdown);
              setShowLanguageDropdown(false);
            }}
            className={`dropdown ${selectedLabels.length > 0 ? 'active' : ''}`}
            style={{
              paddingRight: selectedLabels.length > 0 ? '32px' : '14px',
              background: selectedLabels.length > 0 ? 'rgba(0, 130, 123, 0.12)' : undefined,
              color: selectedLabels.length > 0 ? 'var(--color-primary)' : undefined
            }}
          >
            <span className="whitespace-nowrap">
              {selectedLabels.length === 0 ? 'Label' : 
               selectedLabels.length === 1 ? selectedLabels[0] : 
               `${selectedLabels.length} labels`}
            </span>
            {selectedLabels.length === 0 && (
              <span className="text-[10px] opacity-60 inline-block translate-y-[1px]">▼</span>
            )}
            {selectedLabels.length > 0 && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLabels([]);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-transparent text-primary text-base cursor-pointer flex items-center justify-center transition-all font-semibold leading-none hover:bg-primary/20"
              >
                ×
              </span>
            )}
          </button>
          
          {showLabelDropdown && (
            <div onClick={(e) => e.stopPropagation()} className="dropdown-menu max-h-[280px] overflow-auto">
              {availableLabels.filter(l => l !== 'all' && l).map(label => {
                const isSelected = selectedLabels.includes(label);
                return (
                  <button
                    key={label}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLabels(prev => 
                        isSelected 
                          ? prev.filter(l => l !== label)
                          : [...prev, label]
                      );
                    }}
                    className={`dropdown-item ${isSelected ? 'selected' : ''}`}
                  >
                    {label}
                    {isSelected && <span className="text-[11px]">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

