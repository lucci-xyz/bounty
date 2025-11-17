export const metadata = {
  title: 'BountyPay Home - Mini App',
  description: 'Browse and claim GitHub bounties on Base and Mezo',
  openGraph: {
    title: 'BountyPay Home - Mini App',
    description: 'Browse and claim GitHub bounties on Base and Mezo',
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://bountypay.app/icons/og.png',
    'fc:frame:button:1': 'View Bounties',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:1:target': 'https://bountypay.app/home',
  },
};

export default function HomeLayout({ children }) {
  return children;
}
