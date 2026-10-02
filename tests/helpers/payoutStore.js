/**
 * In-memory payout store for tests. Reproduces the real helpers' conditional
 * update contract (match-then-flip, report whether exactly one row flipped),
 * including the bounty lease's fencing on its acquire stamp. Not a test file:
 * the node --test glob only runs *.test.js.
 */
import {
  BOUNTY_STATUS,
  CLAIM_STATUS,
  isAcquirableClaimStatus,
  isResolvingLeaseStale
} from '../../lib/status/index.js';

export const ADDR = '0x1111111111111111111111111111111111111111';
export const NOW = 1720000000000;
export const TX = '0x' + 'ab'.repeat(32);

export const silentLogger = { info() {}, warn() {}, error() {} };

export function createPayoutStore({ claims = [], bounties = [] } = {}) {
  const claimRows = new Map();
  for (const c of claims) {
    claimRows.set(c.id, { txHash: null, resolvedAt: null, ...c });
  }
  const bountyRows = new Map();
  for (const b of bounties) {
    bountyRows.set(b.bountyId, { txHash: null, ...b });
  }

  const prClaimQueries = {
    findById: (id) => {
      const row = claimRows.get(id);
      return row ? { ...row } : null;
    },
    tryAcquireForPayout: (id, { includeProcessing = false } = {}) => {
      const row = claimRows.get(id);
      if (!row || !isAcquirableClaimStatus(row.status, includeProcessing)) return false;
      row.status = CLAIM_STATUS.PROCESSING;
      return true;
    },
    settlePayout: (id, txHash, resolvedAt) => {
      const row = claimRows.get(id);
      if (!row || row.status !== CLAIM_STATUS.PROCESSING) return false;
      row.status = CLAIM_STATUS.PAID;
      row.txHash = txHash;
      row.resolvedAt = resolvedAt;
      return true;
    },
    releasePayout: (id, toStatus = CLAIM_STATUS.FAILED) => {
      const row = claimRows.get(id);
      if (!row || row.status !== CLAIM_STATUS.PROCESSING) return false;
      row.status = toStatus;
      return true;
    },
    recordPayoutTx: (id, txHash) => {
      const row = claimRows.get(id);
      if (!row || row.status !== CLAIM_STATUS.PROCESSING) return false;
      row.txHash = txHash;
      return true;
    },
    closeStrandedClaims: (bountyId, { exceptClaimId = null, resolvedTxHash = null, resolvedAt = 0 } = {}) => {
      let paid = 0;
      for (const row of claimRows.values()) {
        if (row.bountyId !== bountyId || row.id === exceptClaimId) continue;
        if (row.status !== CLAIM_STATUS.PROCESSING) continue;
        if (resolvedTxHash && row.txHash === resolvedTxHash) {
          row.status = CLAIM_STATUS.PAID;
          row.resolvedAt = resolvedAt;
          paid += 1;
        } else {
          row.status = CLAIM_STATUS.FAILED;
        }
      }
      return paid;
    }
  };

  // Leases are fenced on the acquire stamp, exactly like the real helpers'
  // `updatedAt` match: a worker holding an older stamp cannot move the row.
  const holds = (row, lease) => row && row.status === BOUNTY_STATUS.RESOLVING && row.updatedAt === lease;
  const bountyQueries = {
    tryAcquireForPayout: (bountyId, nowMs) => {
      const row = bountyRows.get(bountyId);
      if (!row) return { acquired: false, stolen: false, lease: null };
      if (row.status === BOUNTY_STATUS.OPEN) {
        row.status = BOUNTY_STATUS.RESOLVING;
        row.updatedAt = nowMs;
        return { acquired: true, stolen: false, lease: nowMs };
      }
      if (
        row.status === BOUNTY_STATUS.RESOLVING &&
        isResolvingLeaseStale(row.updatedAt, nowMs)
      ) {
        row.updatedAt = nowMs;
        return { acquired: true, stolen: true, lease: nowMs };
      }
      return { acquired: false, stolen: false, lease: null };
    },
    settlePayout: (bountyId, txHash, lease) => {
      const row = bountyRows.get(bountyId);
      if (!holds(row, lease)) return false;
      row.status = BOUNTY_STATUS.RESOLVED;
      row.txHash = txHash;
      return true;
    },
    releasePayout: (bountyId, lease, toStatus = BOUNTY_STATUS.OPEN) => {
      const row = bountyRows.get(bountyId);
      if (!holds(row, lease)) return false;
      row.status = toStatus;
      return true;
    }
  };

  bountyQueries.findStaleResolving = (nowMs) =>
    [...bountyRows.values()]
      .filter((row) => row.status === BOUNTY_STATUS.RESOLVING && isResolvingLeaseStale(row.updatedAt, nowMs))
      .map((row) => ({ ...row }));
  prClaimQueries.findByBountyId = (bountyId) =>
    [...claimRows.values()].filter((row) => row.bountyId === bountyId).map((row) => ({ ...row }));

  return { prClaimQueries, bountyQueries, claimRows, bountyRows };
}

export function depsFor(store, resolveBounty, readOnchainStatus = () => BOUNTY_STATUS.OPEN) {
  return {
    prClaimQueries: store.prClaimQueries,
    bountyQueries: store.bountyQueries,
    resolveBounty,
    readOnchainStatus,
    logger: silentLogger
  };
}

export function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
