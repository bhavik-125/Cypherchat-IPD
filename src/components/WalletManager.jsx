import React from 'react';

const WalletManager = ({ 
  account, 
  balance, 
  networkName, 
  gasPrice, 
  onDisconnect, 
  onSwitchNetwork,
  isWrongNetwork,
  formatBalance,
  formatAddress 
}) => {
  const handleCopyAddress = () => {
    navigator.clipboard.writeText(account);
    // Show toast
  };

  const handleViewOnExplorer = () => {
    const explorer = networkName.includes('sepolia') 
      ? `https://sepolia.etherscan.io/address/${account}`
      : `https://etherscan.io/address/${account}`;
    window.open(explorer, '_blank');
  };

  return (
    <div className="wallet-manager">
      <div className="wallet-header">
        <h3>Wallet</h3>
        <button onClick={onDisconnect} className="btn btn-outline">
          Disconnect
        </button>
      </div>
      
      <div className="wallet-info-card">
        <div className="wallet-address-display">
          <span className="address-label">Address:</span>
          <code className="address-value">{formatAddress(account)}</code>
          <div className="address-actions">
            <button onClick={handleCopyAddress} className="btn-icon" title="Copy address">
              📋
            </button>
            <button onClick={handleViewOnExplorer} className="btn-icon" title="View on explorer">
              🔍
            </button>
          </div>
        </div>
        
        <div className="wallet-balance-display">
          <span className="balance-label">Balance:</span>
          <span className="balance-value">{formatBalance(balance)}</span>
        </div>
        
        <div className="network-info">
          <span className="network-label">Network:</span>
          <span className={`network-value ${isWrongNetwork ? 'error' : ''}`}>
            {networkName}
          </span>
          {gasPrice && (
            <span className="gas-price">Gas: {parseFloat(gasPrice).toFixed(0)} Gwei</span>
          )}
        </div>
        
        {isWrongNetwork && (
          <button onClick={() => onSwitchNetwork('sepolia')} className="btn btn-warning">
            Switch to Sepolia
          </button>
        )}
      </div>
      
      <div className="transaction-history">
        <h4>Recent Transactions</h4>
        {/* Transaction list */}
      </div>
    </div>
  );
};

export default WalletManager;