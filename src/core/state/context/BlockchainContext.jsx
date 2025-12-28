import { createContext, useContext } from "react";

const BlockchainContext = createContext(null);

export const BlockchainProvider = ({ children }) => {
  return (
    <BlockchainContext.Provider value={{}}>
      {children}
    </BlockchainContext.Provider>
  );
};

export const useBlockchain = () => useContext(BlockchainContext);
