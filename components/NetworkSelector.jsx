/**
 * Network selection component for blockchain operations
 */
export default function NetworkSelector({ selectedNetwork, onNetworkChange, disabled = false }) {
  const networks = [
    { key: 'BASE_SEPOLIA', name: 'Base Sepolia', token: 'USDC' },
    { key: 'MEZO_TESTNET', name: 'Mezo Testnet', token: 'MUSD' }
  ];

  return (
    <div className="mb-6">
      <label>Select Network</label>
      <div className="flex gap-2">
        {networks.map(network => (
          <button
            key={network.key}
            onClick={() => !disabled && onNetworkChange(network.key)}
            disabled={disabled}
            className="flex-1 p-3 rounded-lg text-sm font-semibold transition-all"
            style={{
              border: selectedNetwork === network.key 
                ? '2px solid var(--color-primary)' 
                : '1px solid var(--color-border)',
              background: selectedNetwork === network.key 
                ? 'rgba(0, 130, 123, 0.1)' 
                : 'var(--color-card)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              color: selectedNetwork === network.key 
                ? 'var(--color-primary)' 
                : 'var(--color-text-primary)',
              opacity: disabled ? 0.6 : 1
            }}
          >
            {network.name}
            <div className="text-xs font-normal mt-1 text-secondary">
              {network.token}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

