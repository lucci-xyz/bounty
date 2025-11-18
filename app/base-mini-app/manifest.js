const FALLBACK_URL = 'https://example.com';

function resolveBaseUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_BASE_MINIAPP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL;

  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '');
  }

  return FALLBACK_URL;
}

const BASE_URL = resolveBaseUrl();
const ICON_URL = `${BASE_URL}/icons/og.png`;
const HOME_URL = `${BASE_URL}/base-mini-app`;

export const MINI_APP_MANIFEST = {
  accountAssociation: {
    header: process.env.NEXT_PUBLIC_ACCOUNT_ASSOC_HEADER || '',
    payload: process.env.NEXT_PUBLIC_ACCOUNT_ASSOC_PAYLOAD || '',
    signature: process.env.NEXT_PUBLIC_ACCOUNT_ASSOC_SIGNATURE || '',
  },
  baseBuilder: {
    ownerAddress: process.env.NEXT_PUBLIC_BASE_OWNER_ADDRESS || '0x',
  },
  miniapp: {
    version: '1',
    name: 'BountyPay Mini',
    homeUrl: HOME_URL,
    iconUrl: ICON_URL,
    splashImageUrl: ICON_URL,
    splashBackgroundColor: '#000000',
    webhookUrl: `${BASE_URL}/api/webhooks/github`,
    subtitle: 'Fund and claim GitHub bounties',
    description: 'Explore public bounties, fund issues, and track payouts from one compact Base mini app.',
    screenshotUrls: [ICON_URL],
    primaryCategory: 'finance',
    tags: ['bounties', 'github', 'crypto'],
    heroImageUrl: ICON_URL,
    tagline: 'Automate GitHub bounties',
    ogTitle: 'BountyPay Mini App',
    ogDescription: 'Fund open-source issues and pay contributors automatically.',
    ogImageUrl: ICON_URL,
    noindex: false,
  },
};

export const MINI_APP_EMBED = {
  version: 'next',
  imageUrl: ICON_URL,
  button: {
    title: 'Launch BountyPay Mini',
    action: {
      type: 'launch_miniapp',
      name: 'BountyPay Mini',
      url: HOME_URL,
      splashImageUrl: ICON_URL,
      splashBackgroundColor: '#000000',
    },
  },
};


