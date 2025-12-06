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
        width={36}
        height={36}
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
    <div className={`flex items-center justify-center rounded-full ${colors[colorIndex]} text-white font-semibold text-sm w-9 h-9 ${className}`}>
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
        className="relative w-full max-w-[340px] mx-4 bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-[18px] pt-[18px] pb-2">
          <h2 className="text-[17px] font-bold text-[#25292E]">Select Token</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-[28px] h-[28px] rounded-full bg-[#F5F5F7] hover:bg-[#E8E8EA] transition-colors"
            aria-label="Close"
          >
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L13 13M1 13L13 1" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Token list */}
        <div className="px-[14px] pb-[18px] pt-1">
          <div className="space-y-1">
            {tokens.map((token, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={token.address}
                  onClick={() => handleSelect(index)}
                  className={`
                    w-full flex items-center gap-[12px] px-[12px] py-[12px] rounded-xl transition-all duration-150
                    ${isSelected 
                      ? 'bg-[#F5F5F7]' 
                      : 'hover:bg-[#F5F5F7]/60'
                    }
                  `}
                >
                  {/* Token icon */}
                  <TokenIcon symbol={token.symbol} />
                  
                  {/* Token info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-bold text-[#25292E] text-[16px]">
                      {token.symbol}
                    </div>
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="flex items-center gap-[6px] shrink-0">
                      <span className="text-[14px] font-medium text-[#A0A4AB]">Selected</span>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.5 7L5.5 10L11.5 4" stroke="#A0A4AB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
