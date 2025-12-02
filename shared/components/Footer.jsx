import Link from 'next/link';
import Socials from './Socials';

/**
 * Footer component with multi-column links
 */
export default function Footer() {
  const footerLinks = {
    product: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Bounties', href: '/app' },
    ],
    resources: [
      { label: 'Documentation', href: '/app/docs' },
      { label: 'GitHub', href: 'https://github.com/lucci-foundation' },
    ],
    company: [
      { label: 'About', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  };

  return (
    <footer className="w-full border-t border-border bg-card">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-base font-semibold text-foreground mb-3 block">
              BountyPay
            </Link>
            <p className="text-xs text-muted-foreground mb-5">
              The economic layer for open source.
            </p>
            <Socials />
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-xs font-medium text-foreground mb-3">Product</h4>
            <ul className="space-y-2.5">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link 
                    href={link.href}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources links */}
          <div>
            <h4 className="text-xs font-medium text-foreground mb-3">Resources</h4>
            <ul className="space-y-2.5">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link 
                    href={link.href}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h4 className="text-xs font-medium text-foreground mb-3">Company</h4>
            <ul className="space-y-2.5">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link 
                    href={link.href}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-border">
          <p className="text-[11px] text-muted-foreground text-center">
            © {new Date().getFullYear()} Lucci. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
