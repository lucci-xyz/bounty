'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

/**
 * Known token icons from external CDN
 */
const TOKEN_ICONS = {
  USDC: 'https://logo.svgcdn.com/token-branded/usdc.png',
  EURC: 'https://logo.svgcdn.com/token-branded/eurc.png',
};

/**
 * Token icon component - displays token logo or fallback
 */
function TokenIcon({ symbol, className = '' }) {
  const iconUrl = TOKEN_ICONS[symbol.toUpperCase()];
  
  if (iconUrl) {
    return (
      <Image
        src={iconUrl}
        alt={symbol}
        width={28}
        height={28}
        className={`rounded-full ${className}`}
        unoptimized
      />
    );
  }
  
  // Fallback: colored circle with initials
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-orange-500',
  ];
  const colorIndex = symbol.charCodeAt(0) % colors.length;
  
  return (
    <div className={`flex items-center justify-center rounded-full ${colors[colorIndex]} text-white font-semibold text-xs w-7 h-7 ${className}`}>
      {symbol.slice(0, 2)}
    </div>
  );
}

/**
 * TokenSelectorModal - A RainbowKit-styled modal for selecting tokens.
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
        className="relative w-full max-w-[400px] mx-4 bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-base font-semibold text-gray-900">Select Token</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L13 13M1 13L13 1" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Token list */}
        <div className="px-3 pb-3">
          <div className="space-y-1">
            {tokens.map((token, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={token.address}
                  onClick={() => handleSelect(index)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150
                    ${isSelected 
                      ? 'bg-gray-100' 
                      : 'hover:bg-gray-50'
                    }
                  `}
                >
                  {/* Token icon */}
                  <TokenIcon symbol={token.symbol} />
                  
                  {/* Token info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium text-gray-900 text-sm">
                      {token.symbol}
                    </div>
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-medium text-gray-500">Selected</span>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.5 7L5.5 10L11.5 4" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
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
