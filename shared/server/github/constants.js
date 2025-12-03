import { CONFIG } from '../config.js';
import { getLinkHref } from '@/shared/config/links';

export const FRONTEND_BASE = CONFIG.frontendUrl.replace(/\/$/, '');
export const CTA_BUTTON = `${FRONTEND_BASE}/buttons/create-bounty.svg`;
export const OG_ICON = `${FRONTEND_BASE}/icons/og.png`;
export const BRAND_SIGNATURE =
  `_By BountyPay <img src="${OG_ICON}" alt="BountyPay Icon" width="16" height="16" />_`;

export const BADGE_BASE = getLinkHref('assets', 'badgeBase');
export const BADGE_LABEL_COLOR = '111827';
export const BADGE_STYLE = 'for-the-badge';

