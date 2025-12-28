import { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { debounce, throttle } from 'lodash';
import { config } from '../config/environment';
import { WalletError, NetworkError, TransactionError } from '../utils/errorHandler';

export const useWallet = () => {
  // State
  const [walletState, setWalletState] = useState({
    account: null,
    chainId: null,
    balance: '0',
    isConnecting: false,
    isConnected: false,
    provider: null,
    signer: null,
    network: null,
    error: null,
    pendingTransactions: new Map(),
    transactionHistory: [],
    walletType: null, // 'metamask', 'walletconnect', 'coinbase'
  });
  
  // Available wallet providers
  const walletProviders = useMemo(() => ({
    metamask: {
      id: 'metamask',
      name: 'MetaMask',
      icon: '🦊',
      supported: typeof window.ethereum !== 'undefined',
      mobileSupport: true,
      deeplink: 'https://metamask.app.link/dapp/',
    },
    walletconnect: {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: '🔗',
      supported: true,
      mobileSupport: true,
      requiresSetup: true,
    },
    coinbase: {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      icon: '💰',
      supported: typeof window.ethereum?.isCoinbaseWallet !== 'undefined',
      mobileSupport: true,
    },
  }), []);
  
  // Detect mobile MetaMask
  const isMobileMetaMask = useMemo(() => {
    const ua = navigator.userAgent;
    return /MetaMaskMobile/i.test(ua) && /Android|iPhone|iPad/i.test(ua);
  }, []);
  
  // Initialize provider
  const initializeProvider = useCallback(async (providerType = 'metamask') => {
    try {
      setWalletState(prev => ({ ...prev, isConnecting: true, error: null }));
      
      let provider;
      let signer;
      
      switch (providerType) {
        case 'metamask':
          if (!window.ethereum) {
            throw new WalletError('MetaMask not installed', 'META_MASK_NOT_INSTALLED');
          }
          
          // Request accounts
          const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts',
          });
          
          if (!accounts || accounts.length === 0) {
            throw new WalletError('No accounts found', 'NO_ACCOUNTS');
          }
          
          provider = new ethers.BrowserProvider(window.ethereum);
          signer = await provider.getSigner();
          
          break;
          
        case 'walletconnect':
          // Initialize WalletConnect
          const { default: WalletConnect } = await import('@walletconnect/web3-provider');
          const walletConnectProvider = new WalletConnect({
            rpc: {
              [config.chainId]: config.rpcUrl,
            },
          });
          
          await walletConnectProvider.enable();
          provider = new ethers.BrowserProvider(walletConnectProvider);
          signer = await provider.getSigner();
          
          break;
          
        default:
          throw new WalletError('Unsupported wallet type', 'UNSUPPORTED_WALLET');
      }
      
      // Get network and account info
      const network = await provider.getNetwork();
      const account = await signer.getAddress();
      const balance = await provider.getBalance(account);
      
      // Check if on correct network
      if (network.chainId !== BigInt(config.chainId)) {
        throw new NetworkError(
          `Please switch to network ID: ${config.chainId}`,
          'WRONG_NETWORK',
          { current: network.chainId, required: config.chainId }
        );
      }
      
      setWalletState(prev => ({
        ...prev,
        account,
        chainId: network.chainId,
        balance: ethers.formatEther(balance),
        isConnecting: false,
        isConnected: true,
        provider,
        signer,
        network,
        walletType: providerType,
        error: null,
      }));
      
      // Store session
      localStorage.setItem('wallet_session', JSON.stringify({
        walletType: providerType,
        account,
        timestamp: Date.now(),
      }));
      
      return { provider, signer, account };
      
    } catch (error) {
      setWalletState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message,
      }));
      
      throw error;
    }
  }, []);
  
  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    try {
      // Clean up based on wallet type
      if (walletState.walletType === 'walletconnect') {
        // Disconnect WalletConnect session
        const { default: WalletConnect } = await import('@walletconnect/web3-provider');
        // Additional cleanup if needed
      }
      
      // Clear state
      setWalletState({
        account: null,
        chainId: null,
        balance: '0',
        isConnecting: false,
        isConnected: false,
        provider: null,
        signer: null,
        network: null,
        error: null,
        pendingTransactions: new Map(),
        transactionHistory: [],
        walletType: null,
      });
      
      // Clear session
      localStorage.removeItem('wallet_session');
      
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }, [walletState.walletType]);
  
  // Switch network
  const switchNetwork = useCallback(async (chainId = config.chainId) => {
    try {
      if (!window.ethereum) {
        throw new WalletError('Wallet not connected', 'WALLET_NOT_CONNECTED');
      }
      
      const chainIdHex = `0x${chainId.toString(16)}`;
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
      
      // Refresh connection
      await initializeProvider(walletState.walletType);
      
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          // Add the network
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${config.chainId.toString(16)}`,
                chainName: 'Sepolia Testnet',
                nativeCurrency: {
                  name: 'Sepolia ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: [config.rpcUrl],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
          
          // Try switching again
          await switchNetwork(chainId);
          
        } catch (addError) {
          throw new NetworkError('Failed to add network', 'NETWORK_ADD_FAILED', addError);
        }
      } else {
        throw new NetworkError('Failed to switch network', 'NETWORK_SWITCH_FAILED', switchError);
      }
    }
  }, [initializeProvider, walletState.walletType]);
  
  // Send transaction with enhanced features
  const sendTransaction = useCallback(async (transactionConfig) => {
    const {
      to,
      value = '0',
      data = '0x',
      gasLimit,
      maxPriorityFeePerGas,
      maxFeePerGas,
      nonce,
    } = transactionConfig;
    
    try {
      if (!walletState.signer) {
        throw new WalletError('Signer not available', 'SIGNER_NOT_AVAILABLE');
      }
      
      // Create transaction
      const tx = {
        to,
        value: ethers.parseEther(value),
        data,
        ...(gasLimit && { gasLimit }),
        ...(maxPriorityFeePerGas && { maxPriorityFeePerGas }),
        ...(maxFeePerGas && { maxFeePerGas }),
        ...(nonce && { nonce }),
      };
      
      // Estimate gas if not provided
      const estimatedGas = gasLimit || await walletState.provider.estimateGas(tx);
      
      // Add buffer for mobile
      const gasBuffer = isMobileMetaMask ? 1.5 : 1.2;
      const finalGasLimit = Math.floor(Number(estimatedGas) * gasBuffer);
      
      // Send transaction
      const transaction = await walletState.signer.sendTransaction({
        ...tx,
        gasLimit: finalGasLimit,
      });
      
      // Track pending transaction
      setWalletState(prev => ({
        ...prev,
        pendingTransactions: new Map(prev.pendingTransactions.set(transaction.hash, {
          hash: transaction.hash,
          timestamp: Date.now(),
          status: 'pending',
          from: walletState.account,
          to,
          value,
        })),
      }));
      
      // Wait for confirmation
      const receipt = await transaction.wait();
      
      // Update transaction status
      setWalletState(prev => {
        const newPending = new Map(prev.pendingTransactions);
        newPending.delete(transaction.hash);
        
        const newHistory = [
          {
            hash: transaction.hash,
            timestamp: Date.now(),
            status: receipt.status === 1 ? 'confirmed' : 'failed',
            from: walletState.account,
            to,
            value,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber,
          },
          ...prev.transactionHistory.slice(0, 49), // Keep last 50
        ];
        
        return {
          ...prev,
          pendingTransactions: newPending,
          transactionHistory: newHistory,
        };
      });
      
      // Update balance
      const balance = await walletState.provider.getBalance(walletState.account);
      setWalletState(prev => ({
        ...prev,
        balance: ethers.formatEther(balance),
      }));
      
      return receipt;
      
    } catch (error) {
      throw new TransactionError('Transaction failed', 'TRANSACTION_FAILED', {
        originalError: error,
        transaction: transactionConfig,
      });
    }
  }, [walletState, isMobileMetaMask]);
  
  // Event listeners for wallet changes
  useEffect(() => {
    if (!window.ethereum || !walletState.isConnected) return;
    
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== walletState.account) {
        // Account changed
        setWalletState(prev => ({ ...prev, account: accounts[0] }));
      }
    };
    
    const handleChainChanged = () => {
      // Reload the page or re-initialize connection
      window.location.reload();
    };
    
    const handleDisconnect = () => {
      disconnectWallet();
    };
    
    // Subscribe to events
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('disconnect', handleDisconnect);
    
    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, [walletState.isConnected, walletState.account, disconnectWallet]);
  
  // Auto-reconnect on page load
  useEffect(() => {
    const reconnect = async () => {
      try {
        const session = localStorage.getItem('wallet_session');
        if (session) {
          const { walletType } = JSON.parse(session);
          await initializeProvider(walletType);
        }
      } catch (error) {
        console.warn('Auto-reconnect failed:', error);
      }
    };
    
    reconnect();
  }, [initializeProvider]);
  
  // Monitor transaction confirmations
  useEffect(() => {
    if (!walletState.provider || walletState.pendingTransactions.size === 0) return;
    
    const interval = setInterval(async () => {
      for (const [hash, tx] of walletState.pendingTransactions) {
        try {
          const receipt = await walletState.provider.getTransactionReceipt(hash);
          if (receipt) {
            // Transaction confirmed
            setWalletState(prev => {
              const newPending = new Map(prev.pendingTransactions);
              newPending.delete(hash);
              
              return {
                ...prev,
                pendingTransactions: newPending,
              };
            });
          }
        } catch (error) {
          console.warn('Error checking transaction:', error);
        }
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, [walletState.provider, walletState.pendingTransactions]);
  
  return {
    // State
    ...walletState,
    
    // Methods
    connect: initializeProvider,
    disconnect: disconnectWallet,
    switchNetwork,
    sendTransaction,
    
    // Providers info
    walletProviders,
    availableProviders: Object.values(walletProviders).filter(p => p.supported),
    
    // Utilities
    formatAddress: (address) => {
      if (!address) return '';
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    },
    
    // Mobile-specific
    isMobileMetaMask,
    mobileDeeplink: walletState.walletType === 'metamask' 
      ? `${walletProviders.metamask.deeplink}${window.location.href}`
      : null,
  };
};