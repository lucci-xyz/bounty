/**
 * Base modal component with backdrop and centered content
 */
export default function Modal({ 
  isOpen, 
  onClose, 
  children, 
  maxWidth = '500px',
  closeOnBackdrop = true,
  showCloseButton = false 
}) {
  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div 
        className="modal-content"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button onClick={onClose} className="modal-close">
            ×
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

