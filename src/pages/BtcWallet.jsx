import { useEffect, useMemo, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, usePublicClient, useWalletClient, useChainId } from 'wagmi';
import { parseUnits, isAddress, getAddress, formatUnits } from 'viem';
import { NETWORKS, CONTRACTS } from '../config/networks';

function BtcWallet() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const isOnMezo = useMemo(() => chainId === NETWORKS.MEZO_TESTNET.chainId, [chainId]);

  const tokenAddress = CONTRACTS.MEZO_TESTNET.token;
  const tokenDecimals = CONTRACTS.MEZO_TESTNET.tokenDecimals;
  const tokenSymbol = CONTRACTS.MEZO_TESTNET.tokenSymbol;

  const [tokenBalance, setTokenBalance] = useState(null);

  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [status, setStatus] = useState({ message: '', type: '' });

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        if (!isConnected || !address || !isOnMezo) {
          setTokenBalance(null);
          return;
        }
        // balanceOf(address)
        const balance = await publicClient.readContract({
          address: tokenAddress,
          abi: [
            { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' }
          ],
          functionName: 'balanceOf',
          args: [address]
        });
        setTokenBalance(balance);
      } catch (e) {
        setTokenBalance(null);
      }
    };
    fetchBalance();
  }, [isConnected, address, publicClient, isOnMezo, tokenAddress]);

  const showStatus = (message, type) => setStatus({ message, type });

  const handleSend = async () => {
    try {
      if (!isConnected || !walletClient || !address) {
        throw new Error('Connect your wallet first');
      }
      if (!sendTo || !isAddress(sendTo)) {
        throw new Error('Enter a valid recipient address');
      }
      if (!sendAmount || Number(sendAmount) <= 0) {
        throw new Error('Enter a valid amount');
      }
      if (!isOnMezo) {
        throw new Error('Switch to Mezo Testnet (31611)');
      }

      // ERC-20 transfer for MUSD on Mezo Testnet
      const amount = parseUnits(sendAmount, tokenDecimals);

      showStatus(`Sending ${tokenSymbol}...`, 'loading');

      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: [
          { inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], name: 'transfer', outputs: [{ type: 'bool' }], stateMutability: 'nonpayable', type: 'function' }
        ],
        functionName: 'transfer',
        args: [getAddress(sendTo), amount]
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      showStatus(`✅ Sent! Tx: ${receipt.transactionHash}`, 'success');
      setSendAmount('');
      setSendTo('');
      // refresh balance
      try {
        const balance = await publicClient.readContract({
          address: tokenAddress,
          abi: [
            { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' }
          ],
          functionName: 'balanceOf',
          args: [address]
        });
        setTokenBalance(balance);
      } catch {}
    } catch (err) {
      showStatus(err.message || 'Failed to send', 'error');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '600px', padding: '40px' }}>
      <h1 style={{ fontSize: '28px' }}>🪙 Mezo Testnet Token Wallet</h1>
      <p className="subtitle" style={{ marginBottom: '20px' }}>Connect, view balance, and send {tokenSymbol} (testnet)</p>

      <div style={{ marginBottom: '20px' }}>
        <ConnectButton label="Connect wallet" />
      </div>

      {isConnected && (
        <>
          <div className="info-box" style={{ marginBottom: '20px' }}>
            <p><strong>Address:</strong> {address?.slice(0, 6)}...{address?.slice(-4)}</p>
            <p><strong>Chain:</strong> {chainId} (Mezo Testnet expected: 31611)</p>
            <p><strong>Balance:</strong> {tokenBalance !== null ? `${formatUnits(tokenBalance, tokenDecimals)} ${tokenSymbol}` : '—'}</p>
          </div>

          <div>
            <label htmlFor="sendTo">Send To (address)</label>
            <input
              id="sendTo"
              type="text"
              placeholder="0x..."
              value={sendTo}
              onChange={(e) => setSendTo(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="sendAmount">Amount ({tokenSymbol})</label>
            <input
              id="sendAmount"
              type="number"
              min="0"
              step={tokenDecimals === 18 ? '0.000000000000000001' : '0.01'}
              placeholder="0.01"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" onClick={handleSend} style={{ width: '100%' }}>
            Send {tokenSymbol}
          </button>
        </>
      )}

      {status.message && (
        <div className={`status ${status.type}`} style={{ marginTop: '16px' }}>
          {status.message}
        </div>
      )}
    </div>
  );
}

export default BtcWallet;


