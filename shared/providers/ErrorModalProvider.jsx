'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import ErrorModal from '@/shared/components/ErrorModal';

const ErrorModalContext = createContext(null);

const DEFAULT_MODAL_PROPS = {
  title: 'Something went wrong',
  message: 'An unexpected error occurred. Please try again.',
  details: undefined,
  supportLink: undefined,
  supportLabel: 'Contact support',
  primaryActionLabel: 'Retry',
  onPrimaryAction: undefined,
  dismissLabel: 'Close'
};

export function ErrorModalProvider({ children }) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    ...DEFAULT_MODAL_PROPS
  });

  const hideError = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const showError = useCallback((config = {}) => {
    setModalState({
      isOpen: true,
      ...DEFAULT_MODAL_PROPS,
      ...config,
      onPrimaryAction: config.onPrimaryAction
        ? () => {
            config.onPrimaryAction?.();
          }
        : undefined
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      showError,
      hideError
    }),
    [showError, hideError]
  );

  return (
    <ErrorModalContext.Provider value={contextValue}>
      {children}
      <ErrorModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        details={modalState.details}
        supportLink={modalState.supportLink}
        supportLabel={modalState.supportLabel}
        onPrimaryAction={modalState.onPrimaryAction}
        primaryActionLabel={modalState.primaryActionLabel}
        dismissLabel={modalState.dismissLabel}
        onClose={hideError}
      />
    </ErrorModalContext.Provider>
  );
}

export function useErrorModal() {
  const context = useContext(ErrorModalContext);
  if (!context) {
    throw new Error('useErrorModal must be used within ErrorModalProvider');
  }
  return context;
}

