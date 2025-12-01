/**
 * Email templates for BountyPay notifications
 * Organized by category and purpose
 */

// Beta program templates (sent from beta@luccilabs.xyz)
export { renderBetaApprovedEmail } from './beta/approved.js';
export { renderBetaRejectedEmail } from './beta/rejected.js';
export { renderBetaReceivedEmail } from './beta/received.js';

// Transactional templates (sent from no-reply@luccilabs.xyz)
export { renderPrOpenedEmail } from './transactional/prOpened.js';
export { renderBountyExpiredEmail } from './transactional/bountyExpired.js';
export { renderUserErrorEmail, renderOpsErrorEmail } from './transactional/userError.js';
