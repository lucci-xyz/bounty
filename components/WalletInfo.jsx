/**
 * Display connected wallet information
 */
export default function WalletInfo({ address, network, tokenSymbol }) {
  return (
    <div className="wallet-info">
      <div>
        <strong>Connected:</strong> {address?.slice(0, 6)}...{address?.slice(-4)}
      </div>
      <div>
        <strong>Network:</strong> {network} ({tokenSymbol})
      </div>
    </div>
  );
}

