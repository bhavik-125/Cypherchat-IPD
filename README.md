CypherChat
Decentralized End-to-End Encrypted Blockchain Messaging Application

### Overview

CypherChat is a decentralized messaging application built using blockchain technology to provide secure, tamper-resistant, and censorship-free communication. Unlike conventional messaging systems that rely on centralized servers, CypherChat ensures data integrity, transparency, and user ownership through smart contracts and cryptographic encryption.

Messages are end-to-end encrypted, meaning only the sender and receiver can read the content. The blockchain stores only cryptographic proofs, not plaintext messages, ensuring privacy and efficiency.

### Features

End-to-end encrypted messaging

Blockchain-backed message integrity

Immutable message verification using on-chain hashes

Wallet-based authentication (MetaMask supported)

Fully decentralized architecture

Responsive UI for desktop and mobile

Real-time message updates via blockchain events

Gas-optimized smart contracts

### System Architecture
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

### Technology Stack
Frontend

React.js

Vite / Create React App

Tailwind CSS

Ethers.js / Web3.js

Blockchain

Solidity

Ethereum (Sepolia Testnet)

MetaMask Wallet

Cryptography

AES encryption

SHA-256 hashing

Development Tools

Node.js

Hardhat / Truffle

Git and GitHub


### Smart Contract Design

The CypherChat smart contract is responsible for:

Registering message metadata

Storing cryptographic message hashes

Emitting events for real-time updates

Maintaining sender and receiver address mappings

Message contents are never stored on-chain, ensuring privacy and minimizing gas costs.

### Security Model

Client-side encryption before message transmission

Only hashed data stored on blockchain

No centralized message database

Wallet-based identity management

Immutable records prevent tampering
