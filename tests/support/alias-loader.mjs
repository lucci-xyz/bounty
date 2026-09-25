/**
 * ESM resolve hook that lets plain Node load the app's server modules, as Next
 * does: `@/x` from the repository root, and extensionless or directory imports
 * (`./templates/bounties`) as `.js`, `.jsx` or `index.js`.
 *
 * Unit tests import pure modules by relative path and do not need this.
 * Integration tests exercise the real query layer, which does.
 */
import { pathToFileURL, fileURLToPath } from 'node:url';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const isFile = (p) => existsSync(p) && statSync(p).isFile();

export async function resolve(specifier, context, next) {
  let spec = specifier;
  if (spec.startsWith('@/')) spec = pathToFileURL(path.join(ROOT, spec.slice(2))).href;

  if (spec.startsWith('file:') || spec.startsWith('./') || spec.startsWith('../')) {
    const url = spec.startsWith('file:') ? new URL(spec) : new URL(spec, context.parentURL);
    const file = fileURLToPath(url);
    if (!isFile(file)) {
      for (const candidate of [`${file}.js`, `${file}.jsx`, path.join(file, 'index.js')]) {
        if (isFile(candidate)) return next(pathToFileURL(candidate).href, context);
      }
    }
    return next(url.href, context);
  }

  return next(spec, context);
}
