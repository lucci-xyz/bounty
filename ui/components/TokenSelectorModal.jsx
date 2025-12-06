'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * Token icon component - displays token symbol with colored background
 */
function TokenIcon({ symbol, className = '' }) {
  // Generate consistent color from symbol
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-cyan-500',
    'bg-indigo-500',
    'bg-rose-500',
  ];
  const colorIndex = symbol.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];

  return (
    <div className={`flex items-center justify-center rounded-full ${bgColor} text-white font-bold text-xs ${className}`}>
      {symbol.slice(0, 2)}
    </div>
  );
}

/**
 * TokenSelectorModal - A RainbowKit-styled modal for selecting tokens.
 * Matches the look and feel of RainbowKit's Switch Networks modal.
 */
export function TokenSelectorModal({
  isOpen,
  onClose,
  tokens = [],
  selectedIndex = 0,
  onSelect,
}) {
  const modalRef = useRef(null);
  const overlayRef = useRef(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle click outside
  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  }, [onClose]);

  // Handle token selection
  const handleSelect = useCallback((index) => {
    onSelect(index);
    onClose();
  }, [onSelect, onClose]);

  // Don't render on server or when closed
  if (typeof window === 'undefined' || !isOpen) {
    return null;
  }

  const modalContent = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      style={{ isolation: 'isolate' }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-[360px] mx-4 bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-gray-900">Select Token</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L13 13M1 13L13 1" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Token list */}
        <div className="px-3 pb-4">
          <div className="space-y-1">
            {tokens.map((token, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={token.address}
                  onClick={() => handleSelect(index)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150
                    ${isSelected 
                      ? 'bg-[#1a4d3e] text-white' 
                      : 'hover:bg-gray-100 text-gray-900'
                    }
                  `}
                >
                  {/* Token icon */}
                  <TokenIcon symbol={token.symbol} className="w-9 h-9 shrink-0" />
                  
                  {/* Token info */}
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                      {token.symbol}
                    </div>
                    {token.name && (
                      <div className={`text-xs ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                        {token.name}
                      </div>
                    )}
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-white/90">Selected</span>
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render at document body level
  return createPortal(modalContent, document.body);
}

export default TokenSelectorModal;

