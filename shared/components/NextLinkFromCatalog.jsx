import Link from 'next/link';
import { resolveLink } from '@/shared/config/links';

/**
 * Next.js Link component tied to the shared link catalog.
 */
export function NextLinkFromCatalog({ section, link, params, children, target, rel, ...rest }) {
  const { href, meta } = resolveLink(section, link, params);
  const resolvedTarget = target ?? meta.target ?? undefined;
  const resolvedRel = rel ?? meta.rel ?? undefined;

  return (
    <Link href={href} target={resolvedTarget} rel={resolvedRel} {...rest}>
      {children}
    </Link>
  );
}


