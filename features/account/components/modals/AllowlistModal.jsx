"use client";

import AllowlistManager from '@/features/account/components/AllowlistManager';

/**
 * Modal for managing the allowlist of a bounty.
 *
 * @param {Object}   props
 * @param {Object}   props.bounty - Bounty object containing info like repo and issue number.
 * @param {string}   props.bountyId - ID of the bounty.
 * @param {Array}    props.allowlistModalData - Initial list of allowed users.
 * @param {boolean}  props.allowlistModalLoading - Whether the allowlist data is loading.
 * @param {Function} props.close - Function to close the modal.
 */
export function AllowlistModal({
  bounty,
  bountyId,
  allowlistModalData,
  allowlistModalLoading,
  close
}) {
  // Hide modal if there is no bountyId
  if (!bountyId) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-background/70 backdrop-blur-md flex items-center justify-center p-5 z-[9999]"
      onClick={close}
    >
      <div
        className="bg-card rounded-2xl max-w-2xl w-full p-8 shadow-lg relative border border-border/40"
        style={{ maxHeight: '85vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-start gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground/80 mb-2">Allowlist</p>
            <h2 className="text-foreground text-xl font-light tracking-tight">Manage Access</h2>
            {/* Show bounty repo and issue number if available */}
            {bounty && (
              <p className="text-sm text-muted-foreground/80 mt-1 font-light">
                {bounty.repoFullName}#{bounty.issueNumber}
              </p>
            )}
          </div>
          {/* Button to close the modal */}
          <button
            onClick={close}
            className="text-2xl leading-none text-muted-foreground hover:text-foreground transition-colors"
            style={{ background: 'none', border: 'none' }}
            aria-label="Close allowlist modal"
          >
            ×
          </button>
        </div>
        {/* Show loading state or allowlist manager */}
        {allowlistModalLoading && !allowlistModalData.length ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading allowlist…</div>
        ) : (
          <AllowlistManager bountyId={bountyId} initialAllowlist={allowlistModalData} />
        )}
      </div>
    </div>
  );
}

