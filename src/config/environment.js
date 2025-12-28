export const config = {
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  version: process.env.REACT_APP_VERSION,
  
  // Blockchain
  contractAddress: process.env.REACT_APP_CONTRACT_ADDRESS,
  chainId: parseInt(process.env.REACT_APP_CHAIN_ID || '11155111'),
  rpcUrl: process.env.REACT_APP_RPC_URL,
  wsUrl: process.env.REACT_APP_WS_URL,
  
  // Features
  features: {
    pushNotifications: process.env.REACT_APP_ENABLE_PUSH_NOTIFICATIONS === 'true',
    fileSharing: process.env.REACT_APP_ENABLE_FILE_SHARING === 'true',
    voiceMessages: process.env.REACT_APP_ENABLE_VOICE_MESSAGES === 'true',
  },
  
  // Services
  ipfs: {
    apiKey: process.env.REACT_APP_IPFS_API_KEY,
    apiSecret: process.env.REACT_APP_IPFS_API_SECRET,
  },
  
  // Analytics
  analytics: {
    gaTrackingId: process.env.REACT_APP_GA_TRACKING_ID,
    sentryDsn: process.env.REACT_APP_SENTRY_DSN,
  },
};

// Validate required configuration
export const validateConfig = () => {
  const required = ['contractAddress', 'rpcUrl'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  return true;
};