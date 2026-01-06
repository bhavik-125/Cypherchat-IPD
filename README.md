# Cypherchat-IPD

<p>
  <strong>Secure. Real-time. Private.</strong>
</p>

<p>
  <a href="https://github.com/bhavik-125/Cypherchat-IPD/actions">
    <img src="https://img.shields.io/badge/Build-Passing-brightgreen?style=flat-square" />
  </a>
  <a href="https://github.com/bhavik-125/Cypherchat-IPD/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" />
  </a>
  <a href="https://github.com/bhavik-125/Cypherchat-IPD/pulls">
    <img src="https://img.shields.io/badge/PRs-Welcome-orange?style=flat-square" />
  </a>
</p>

---

## Overview

<p>
Cypherchat-IPD is a decentralized, blockchain-based messaging application designed to provide secure, tamper-resistant, and censorship-free communication. Unlike traditional messaging systems that rely on centralized servers, Cypherchat-IPD ensures data integrity, transparency, and user ownership through smart contracts and cryptographic encryption.
</p>

<p>
Messages are end-to-end encrypted, meaning only the sender and receiver can read the content. The blockchain stores only cryptographic proofs, not plaintext messages, ensuring privacy and efficiency.
</p>

---

## Features

<ul>
  <li>End-to-end encrypted messaging</li>
  <li>Blockchain-backed message integrity</li>
  <li>Immutable message verification using on-chain hashes</li>
  <li>Wallet-based authentication (MetaMask supported)</li>
  <li>Fully decentralized architecture</li>
  <li>Responsive UI for desktop and mobile</li>
  <li>Real-time message updates via blockchain events</li>
  <li>Gas-optimized smart contracts</li>
</ul>

---

## System Architecture

<pre>
┌──────────────────────┐
│   React Frontend     │
│   Web3 Interface     │
└─────────┬────────────┘
          │ Wallet Authentication
          ▼
┌──────────────────────┐
│ Ethereum Blockchain  │
│ Smart Contracts      │
└─────────┬────────────┘
          │ Message Hashes
          ▼
┌──────────────────────┐
│ Encrypted Payloads   │
│ Client-side Storage  │
└──────────────────────┘
</pre>

---

## Technology Stack

<p><strong>Frontend</strong></p>
<ul>
  <li>React.js</li>
  <li>Vite / Create React App</li>
  <li>Tailwind CSS</li>
  <li>Ethers.js / Web3.js</li>
</ul>

<p><strong>Blockchain</strong></p>
<ul>
  <li>Solidity</li>
  <li>Ethereum (Sepolia Testnet)</li>
  <li>MetaMask Wallet</li>
</ul>

<p><strong>Cryptography</strong></p>
<ul>
  <li>AES message encryption</li>
  <li>SHA-256 hashing</li>
</ul>

<p><strong>Development Tools</strong></p>
<ul>
  <li>Node.js</li>
  <li>Hardhat / Truffle</li>
  <li>Git and GitHub</li>
</ul>

---

## Smart Contract Design

<p>
The Cypherchat-IPD smart contract is responsible for:
</p>

<ul>
  <li>Registering message metadata</li>
  <li>Storing cryptographic message hashes</li>
  <li>Emitting events for real-time message updates</li>
  <li>Maintaining sender and receiver address mappings</li>
</ul>

<p>
Message contents are never stored on-chain, ensuring privacy and minimizing gas costs.
</p>

---

## Security Model

<ul>
  <li>Client-side encryption before message transmission</li>
  <li>Only hashed data stored on the blockchain</li>
  <li>No centralized message database</li>
  <li>Wallet-based identity management</li>
  <li>Immutable records prevent message tampering</li>
</ul>

---

## Installation and Setup

<p><strong>Prerequisites</strong></p>

<ul>
  <li>Node.js (v18 or higher)</li>
  <li>MetaMask browser extension</li>
  <li>Ethereum Sepolia testnet ETH</li>
</ul>

<p><strong>Steps</strong></p>

<pre>
git clone https://github.com/bhavik-125/Cypherchat-IPD.git
cd Cypherchat-IPD
npm install
npm run dev
</pre>

<p><strong>Environment Configuration</strong></p>

<pre>
REACT_APP_CONTRACT_ADDRESS=0xYourContractAddress
REACT_APP_RPC_URL=YourRPCURL
REACT_APP_CHAIN_ID=11155111
</pre>

---

## Usage

<ol>
  <li>Connect MetaMask wallet</li>
  <li>Enter recipient wallet address</li>
  <li>Compose and send encrypted message</li>
  <li>Messages are encrypted locally and verified via blockchain</li>
</ol>

---

## Project Structure

<pre>
Cypherchat-IPD/
├── src/
│   ├── components/
│   ├── blockchain/
│   ├── hooks/
│   ├── utils/
│   └── App.jsx
├── contracts/
├── public/
├── .env
├── package.json
└── README.md
</pre>

---

## Future Enhancements

<ul>
  <li>Group chat functionality</li>
  <li>IPFS integration for encrypted message storage</li>
  <li>Layer-2 scaling (Polygon / Optimism)</li>
  <li>Mobile application support</li>
  <li>Advanced key management</li>
</ul>

---



## Author

<p>
<strong>Bhavik Thakkar</strong><br/>
Department of Computer Science and Engineering<br/>
Cybersecurity and Blockchain Technology
</p>
