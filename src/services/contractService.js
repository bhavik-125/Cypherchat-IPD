import { BrowserProvider, Contract } from "ethers";
import ContractABI from "./contractABI.json";

const SEPOLIA_CHAIN_ID = 11155111;

class ContractService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.contractAddress =
      process.env.REACT_APP_SEPOLIA_CONTRACT_ADDRESS;
  }

  // ---------- INIT ----------
  async init() {
    if (!window.ethereum) {
      throw new Error("MetaMask not detected");
    }

    this.provider = new BrowserProvider(window.ethereum);

    // Request wallet connection
    await this.provider.send("eth_requestAccounts", []);

    const network = await this.provider.getNetwork();
    if (network.chainId !== BigInt(SEPOLIA_CHAIN_ID)) {
      throw new Error("Please switch MetaMask to Sepolia network");
    }

    this.signer = await this.provider.getSigner();

    // Verify contract exists
    const code = await this.provider.getCode(this.contractAddress);
    if (code === "0x") {
      throw new Error("No contract deployed at this address on Sepolia");
    }

    this.contract = new Contract(
      this.contractAddress,
      ContractABI,
      this.signer
    );

    return true;
  }

  // ---------- USER INFO ----------
  async getUserInfo(address) {
    try {
      if (!this.contract) await this.init();

      const user = await this.contract.users(address);

      // Solidity: (string name, bool exists)
      if (!user.exists) return null;

      return {
        address,
        name: user.name,
        exists: user.exists
      };
    } catch (err) {
      console.error("getUserInfo failed:", err);
      return null;
    }
  }

  async getUserName(address) {
    try {
      if (!this.contract) await this.init();
      return await this.contract.getUserName(address);
    } catch (err) {
      console.warn("getUserName failed:", err);
      return "";
    }
  }

  // ---------- REGISTER ----------
  async registerUser(name) {
    try {
      if (!this.contract) await this.init();

      const tx = await this.contract.registerUser(name);
      await tx.wait();

      return true;
    } catch (err) {
      console.error("registerUser failed:", err);
      return false;
    }
  }

  // ---------- MESSAGING ----------
  async sendMessage(to, content) {
    try {
      if (!this.contract) await this.init();

      const tx = await this.contract.sendMessage(to, content);
      await tx.wait();

      return true;
    } catch (err) {
      console.error("sendMessage failed:", err);
      return false;
    }
  }

  async getUserMessages() {
    try {
      if (!this.contract) await this.init();

      const messages = await this.contract.getUserMessages();

      return messages.map((msg) => ({
        sender: msg.sender,
        receiver: msg.receiver,
        content: msg.content,
        timestamp: new Date(Number(msg.timestamp) * 1000)
      }));
    } catch (err) {
      console.error("getUserMessages failed:", err);
      return [];
    }
  }

  // ---------- ACCOUNT ----------
  async getConnectedAccount() {
    if (!this.signer) await this.init();
    return await this.signer.getAddress();
  }
}

export default new ContractService();
