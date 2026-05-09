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
npm run dev:backend
npm run dev
</pre>

<p><strong>Environment Configuration</strong></p>

<pre>
VITE_CONTRACT_ADDRESS=0xYourContractAddress
VITE_API_BASE_URL=http://localhost:4000/api

# Backend server
PORT=4000
CORS_ORIGIN=http://localhost:5173
</pre>

---

## Backend Services

<ul>
  <li><code>POST /api/geofencing/request-nonce</code> — returns one-time nonce for device challenge</li>
  <li><code>POST /api/geofencing/evaluate</code> — validates cryptographic telemetry and geofence confidence</li>
  <li><code>POST /api/graph/process</code> — transforms interaction logs into graph nodes/edges</li>
  <li><code>GET /api/health</code> — health check endpoint</li>
</ul>

<p>
For production deployment:
</p>

<pre>
npm run build
npm run start
</pre>

---

## Deploy (Vercel + Render)

<ol>
  <li>Deploy backend from this repo on Render using <code>render.yaml</code> (or Build: <code>npm install</code>, Start: <code>npm run start</code>)</li>
  <li>Set Render env var <code>CORS_ORIGIN</code> to your Vercel frontend URL (comma-separated if multiple domains)</li>
  <li>Deploy frontend on Vercel using <code>vercel.json</code></li>
  <li>Set Vercel env var <code>VITE_API_BASE_URL</code> to <code>https://&lt;your-render-service&gt;.onrender.com/api</code></li>
  <li>Set Vercel env var <code>VITE_CONTRACT_ADDRESS</code> to your deployed contract address</li>
</ol>

---

## Usage

<ol>
  <li>Connect MetaMask wallet</li>
  <li>Enter recipient wallet address</li>
  <li>Compose a message and optionally enable <strong>Geo-lock message</strong>; use <strong>Set Receiver Geofence to My Current Location</strong> to define the unlock location and verify it with the embedded OpenStreetMap preview</li>
  <li>Messages are stored AES-encrypted on-chain and decrypt only when the receiver is within the geofence radius; otherwise encrypted text remains visible</li>
</ol>

---

## Project Structure

<pre>
Cypherchat-IPD/
├── backend/
│   ├── services/
│   ├── utils/
│   └── server.js
├── src/
│   ├── components/
│   ├── blockchain/
│   ├── hooks/
│   ├── utils/
│   ├── services/
│   └── App.jsx
├── public/
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
