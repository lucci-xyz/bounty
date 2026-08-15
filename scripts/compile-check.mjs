/**
 * Compile the escrow contracts with solc-js.
 *
 * Foundry is the project's build tool, but it is not always installable (no
 * network in some sandboxes/CI images). This gives a dependency-light way to
 * confirm the contracts still compile — and to surface warnings — using the
 * exact solc version pinned in foundry.toml, with foundry.toml's remappings.
 *
 * Usage: node scripts/compile-check.mjs [--warnings]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import solc from 'solc';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Mirrors the `remappings` array in foundry.toml. */
const REMAPPINGS = [
  ['@openzeppelin/contracts@5.0.2/', 'node_modules/@openzeppelin/contracts/'],
  ['@openzeppelin/contracts-upgradeable@5.0.2/', 'node_modules/@openzeppelin/contracts-upgradeable/'],
  ['forge-std/', 'node_modules/forge-std/src/']
];

function resolveImport(importPath) {
  for (const [prefix, target] of REMAPPINGS) {
    if (importPath.startsWith(prefix)) {
      return path.join(ROOT, target, importPath.slice(prefix.length));
    }
  }
  return path.join(ROOT, importPath);
}

function findImports(importPath) {
  try {
    return { contents: fs.readFileSync(resolveImport(importPath), 'utf8') };
  } catch (error) {
    return { error: `Not found: ${importPath} (${error.message})` };
  }
}

const SOURCES = process.argv.includes('--with-tests')
  ? ['contracts/current/BountyEscrow.sol', 'test/BountyEscrow.t.sol']
  : ['contracts/current/BountyEscrow.sol'];

const input = {
  language: 'Solidity',
  sources: Object.fromEntries(
    SOURCES.map((file) => [file, { content: fs.readFileSync(path.join(ROOT, file), 'utf8') }])
  ),
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: 'paris',
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
const showWarnings = process.argv.includes('--warnings');

const errors = (output.errors || []).filter((e) => e.severity === 'error');
const warnings = (output.errors || []).filter((e) => e.severity !== 'error');

for (const w of warnings) {
  if (showWarnings) console.warn(`warning: ${w.formattedMessage}`);
}

if (errors.length > 0) {
  for (const e of errors) console.error(e.formattedMessage);
  console.error(`\nFAILED: ${errors.length} compilation error(s)`);
  process.exit(1);
}

for (const file of SOURCES) {
  for (const [name, contract] of Object.entries(output.contracts?.[file] || {})) {
    const size = (contract.evm?.bytecode?.object?.length || 0) / 2;
    // The 24576-byte limit applies to deployed contracts only; test harnesses
    // run locally under forge and are exempt.
    const deployable = !file.startsWith('test/');
    const overLimit = deployable && size > 24576;
    console.log(`ok  ${name.padEnd(16)} ${size} bytes${overLimit ? '  !! EXCEEDS 24576 LIMIT' : ''}`);
  }
}
console.log(`\nCompiled ${SOURCES.length} source file(s) with ${warnings.length} warning(s).`);
