'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * DatePickerModal - A custom date picker modal matching RainbowKit style.
 */
export function DatePickerModal({ isOpen, onClose, value, onChange, minDate }) {
  const modalRef = useRef(null);
  const overlayRef = useRef(null);
  
  // Parse the current value or use today
  const initialDate = useMemo(() => {
    if (value) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date();
  }, [value]);

  const [viewDate, setViewDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(initialDate);

  // Update view when value changes
  useEffect(() => {
    if (value) {
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      setViewDate(date);
      setSelectedDate(date);
    }
  }, [value]);

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

  // Get calendar days for current view
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    
    // Previous month padding
    const prevMonth = new Date(year, month, 0);
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i),
        isCurrentMonth: false,
      });
    }
    
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }
    
    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
    
    return days;
  }, [viewDate]);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDate = (date) => {
    // Check if date is before minDate
    if (minDate) {
      const min = new Date(minDate);
      min.setHours(0, 0, 0, 0);
      if (date < min) return;
    }
    
    setSelectedDate(date);
    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    onChange(`${year}-${month}-${day}`);
    onClose();
  };

  const isSelected = (date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date) => {
    return date.toDateString() === new Date().toDateString();
  };

  const isDisabled = (date) => {
    if (!minDate) return false;
    const min = new Date(minDate);
    min.setHours(0, 0, 0, 0);
    return date < min;
  };

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
        className="relative w-full max-w-[320px] mx-4 bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-base font-semibold text-gray-900">Select Date</h2>
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

        {/* Month navigation */}
        <div className="flex items-center justify-between px-5 py-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 12L6 8L10 4" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-900">
            {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 4L10 8L6 12" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Calendar grid */}
        <div className="px-4 pb-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((day) => (
              <div key={day} className="text-center text-[10px] font-medium text-gray-400 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map(({ date, isCurrentMonth }, index) => {
              const selected = isSelected(date);
              const today = isToday(date);
              const disabled = isDisabled(date);

              return (
                <button
                  key={index}
                  onClick={() => !disabled && handleSelectDate(date)}
                  disabled={disabled}
                  className={`
                    aspect-square flex items-center justify-center text-sm rounded-full transition-all
                    ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                    ${selected ? 'bg-gray-900 text-white' : ''}
                    ${today && !selected ? 'ring-1 ring-gray-300' : ''}
                    ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100'}
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 pb-4 pt-1 border-t border-gray-100">
          <button
            onClick={() => handleSelectDate(new Date())}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={onClose}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default DatePickerModal;

