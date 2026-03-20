import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LINKS } from '../config/links.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const excludedDirectories = new Set(['.git', '.next', 'node_modules']);

function hasCatalogEntry(section, link) {
  return Boolean(LINKS?.[section]?.[link]);
}

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (excludedDirectories.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(fullPath));
      continue;
    }

    if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function collectLinkReferences(contents) {
  const references = [];
  const catalogComponentPattern = /<LinkFromCatalog\b[\s\S]*?\bsection="([^"]+)"[\s\S]*?\blink="([^"]+)"/g;
  const catalogHelperPattern = /\b(?:getLinkHref|getLinkMeta|resolveLink)\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;

  for (const match of contents.matchAll(catalogComponentPattern)) {
    references.push({ section: match[1], link: match[2], source: 'LinkFromCatalog' });
  }

  for (const match of contents.matchAll(catalogHelperPattern)) {
    references.push({ section: match[1], link: match[2], source: 'link helper' });
  }

  return references;
}

async function main() {
  const files = await collectSourceFiles(repoRoot);
  const errors = [];
  let referenceCount = 0;

  for (const filePath of files) {
    const contents = await readFile(filePath, 'utf8');
    const references = collectLinkReferences(contents);

    for (const reference of references) {
      referenceCount += 1;
      if (hasCatalogEntry(reference.section, reference.link)) {
        continue;
      }

      errors.push(
        `${path.relative(repoRoot, filePath)}: unknown ${reference.source} reference ${reference.section}.${reference.link}`
      );
    }
  }

  if (errors.length > 0) {
    console.error('Link catalog validation failed.');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Validated ${referenceCount} catalog link references.`);
}

main().catch((error) => {
  console.error('Link catalog validation failed.');
  console.error(error);
  process.exit(1);
});
