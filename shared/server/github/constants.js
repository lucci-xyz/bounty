import { CONFIG } from '../config.js';
import { getLinkHref } from '@/shared/config/links';

export const FRONTEND_BASE = CONFIG.frontendUrl.replace(/\/$/, '');
export const CTA_BUTTON = `${FRONTEND_BASE}/buttons/create-bounty.svg`;
export const OG_ICON = `${FRONTEND_BASE}/icons/og.png`;
export const BRAND_SIGNATURE = `_ <img src="${FRONTEND_BASE}/buttons/brand-signature.svg" alt="BountyPay signature" width="220" height="40" style="display:inline-block; vertical-align:middle;" />_`;

export const BADGE_BASE = getLinkHref('assets', 'badgeBase');
export const BADGE_LABEL_COLOR = '111827';
export const BADGE_STYLE = 'for-the-badge';

