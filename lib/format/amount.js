const TOKEN_DECIMALS = {
  USDC: 6,
  MUSD: 18
};

const DEFAULT_TOKEN_DECIMALS = 6;

export function formatAmount(
  amount,
  tokenSymbol,
  {
    decimals = TOKEN_DECIMALS[tokenSymbol] ?? DEFAULT_TOKEN_DECIMALS,
    minimumFractionDigits = 0,
    maximumFractionDigits = minimumFractionDigits,
    useGrouping = false
  } = {}
) {
  if (amount === undefined || amount === null) {
    return '0';
  }

  const value = Number(amount) / Math.pow(10, decimals);
  if (!Number.isFinite(value)) {
    return '0';
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping
  });
}

export { TOKEN_DECIMALS };

