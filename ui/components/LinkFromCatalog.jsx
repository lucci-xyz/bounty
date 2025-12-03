import { resolveLink } from '@/config/links';

/**
 * Link wrapper that enforces usage of cataloged URLs.
 */
export function LinkFromCatalog({ section, link, params, children, target, rel, ...rest }) {
  const { href, meta } = resolveLink(section, link, params);
  const resolvedTarget = target ?? meta.target ?? undefined;
  const resolvedRel = rel ?? meta.rel ?? undefined;

  return (
    <a href={href} target={resolvedTarget} rel={resolvedRel} {...rest}>
      {children}
    </a>
  );
}


