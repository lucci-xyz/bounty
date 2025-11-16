/**
 * Styles for the home page bounty list
 */

export const homePageStyles = {
  container: {
    maxWidth: '1200px',
    width: '100%'
  },
  
  containerMobile: {
    padding: '24px 16px'
  },
  
  containerDesktop: {
    padding: '40px 20px'
  },
  
  title: {
    fontFamily: 'Georgia, Times New Roman, serif',
    color: '#00827B',
    marginBottom: '12px'
  },
  
  titleMobile: {
    marginBottom: '8px'
  },
  
  subtitle: {
    color: 'var(--color-text-secondary)'
  },
  
  filterBar: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
    position: 'relative',
    zIndex: 100
  },
  
  filterBarMobile: {
    gap: '6px',
    marginBottom: '16px'
  },
  
  filterBarDesktop: {
    marginBottom: '24px'
  },
  
  sortButton: {
    padding: '8px 14px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    outline: 'none'
  },
  
  sortButtonActive: {
    background: 'var(--color-primary)',
    color: 'white',
    fontWeight: '600'
  },
  
  sortButtonInactive: {
    background: 'var(--color-background-secondary)',
    color: 'var(--color-text-secondary)'
  },
  
  divider: {
    width: '1px',
    height: '24px',
    background: 'var(--color-border)'
  },
  
  dropdownButton: {
    padding: '8px 14px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    cursor: 'pointer',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s',
    outline: 'none',
    position: 'relative',
    minWidth: 'fit-content'
  },
  
  dropdownButtonActive: {
    background: 'rgba(0, 130, 123, 0.12)',
    color: 'var(--color-primary)',
    paddingRight: '32px'
  },
  
  dropdownButtonInactive: {
    background: 'var(--color-background-secondary)',
    color: 'var(--color-text-secondary)'
  },
  
  dropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    background: 'var(--color-background)',
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    zIndex: 1000,
    minWidth: '160px',
    overflow: 'auto',
    padding: '6px'
  },
  
  dropdownMenuItem: {
    width: '100%',
    padding: '8px 12px',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.1s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: '6px'
  },
  
  dropdownMenuItemActive: {
    background: 'rgba(0, 130, 123, 0.12)',
    color: 'var(--color-primary)',
    fontWeight: '500'
  },
  
  dropdownMenuItemInactive: {
    background: 'transparent',
    color: 'var(--color-text)',
    fontWeight: '400'
  },
  
  clearButton: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: 'transparent',
    color: 'var(--color-primary)',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
    fontWeight: '600',
    lineHeight: '1'
  },
  
  bountyCard: {
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.3s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    position: 'relative',
    zIndex: 1
  },
  
  bountyCardMobile: {
    gap: '12px',
    padding: '14px'
  },
  
  bountyCardDesktop: {
    gap: '16px',
    padding: 'clamp(18px, 3vw, 24px)'
  },
  
  bountyCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start'
  },
  
  bountyCardHeaderMobile: {
    gap: '12px',
    flexDirection: 'column'
  },
  
  bountyCardHeaderDesktop: {
    gap: '16px',
    flexDirection: 'row'
  },
  
  bountyCardContent: {
    flex: '1',
    minWidth: '0',
    width: '100%'
  },
  
  bountyCardTitle: {
    color: 'var(--color-primary)',
    textDecoration: 'none',
    wordBreak: 'break-word'
  },
  
  bountyCardTitleWrapper: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  
  bountyCardTitleWrapperMobile: {
    gap: '8px',
    marginBottom: '8px'
  },
  
  bountyCardTitleWrapperDesktop: {
    gap: '12px',
    marginBottom: '12px'
  },
  
  bountyCardStars: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: 'var(--color-text-secondary)'
  },
  
  bountyCardDescription: {
    color: 'var(--color-text-secondary)',
    lineHeight: '1.5'
  },
  
  bountyCardDescriptionMobile: {
    margin: '0 0 8px 0'
  },
  
  bountyCardDescriptionDesktop: {
    margin: '0 0 12px 0'
  },
  
  bountyCardTags: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  
  languageTag: {
    padding: '4px 10px',
    background: 'rgba(0, 130, 123, 0.1)',
    borderRadius: '12px',
    color: 'var(--color-primary)',
    fontWeight: '500'
  },
  
  labelTag: {
    padding: '4px 10px',
    background: 'var(--color-background-secondary)',
    borderRadius: '12px',
    color: 'var(--color-text-secondary)'
  },
  
  bountyAmount: {
    background: 'rgba(131, 238, 232, 0.15)',
    borderRadius: '8px',
    textAlign: 'center',
    textDecoration: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'transform 0.2s, background 0.2s'
  },
  
  bountyAmountMobile: {
    padding: '10px 16px',
    minWidth: '100%',
    width: '100%',
    alignSelf: 'stretch'
  },
  
  bountyAmountDesktop: {
    padding: 'clamp(10px, 2vw, 12px) clamp(16px, 3vw, 20px)',
    minWidth: 'clamp(120px, 20vw, 140px)',
    width: 'auto',
    alignSelf: 'stretch',
    cursor: 'pointer'
  },
  
  bountyAmountValue: {
    color: 'var(--color-primary)',
    marginBottom: '4px'
  },
  
  bountyAmountDeadline: {
    color: 'var(--color-text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  
  emptyStateText: {
    color: 'var(--color-text-secondary)',
    marginBottom: '24px'
  }
};

/**
 * Helper function to merge styles
 */
export function mergeStyles(...styles) {
  return Object.assign({}, ...styles);
}
