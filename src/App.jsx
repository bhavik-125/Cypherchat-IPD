import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ethers } from 'ethers';
import { format } from 'date-fns';
import { 
  Wallet, MessageSquare, Send, Search, ArrowLeft, 
  MoreVertical, Loader2, UserPlus, Shield, X, Copy, Check
} from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import {
  deriveConversationKey,
  encryptMessage as encryptWithAES,
  decryptMessage as decryptWithAES,
  encodeSecurePayload,
  tryParseSecurePayload,
  isWithinGeofence
} from './utils/encryption';

// ==========================================
// 1. CONFIGURATION
// ==========================================
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0xE55A801bbeb3635fe8D74d8F798E070eE6c9f960";

const SEPOLIA_ID = 11155111n;

// EXACT ABI 
const ABI = [
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "sender",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "receiver",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "index",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "MessageBurned",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "isGeoLocked",
				"type": "bool"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "isBurnOnRead",
				"type": "bool"
			}
		],
		"name": "MessageSent",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "userAddress",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "name",
				"type": "string"
			}
		],
		"name": "UserRegistered",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_otherUser",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_index",
				"type": "uint256"
			}
		],
		"name": "burnMessage",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_name",
				"type": "string"
			}
		],
		"name": "register",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_to",
				"type": "address"
			},
			{
				"internalType": "string",
				"name": "_content",
				"type": "string"
			},
			{
				"internalType": "bool",
				"name": "_isGeoLocked",
				"type": "bool"
			},
			{
				"internalType": "int256",
				"name": "_geoLat",
				"type": "int256"
			},
			{
				"internalType": "int256",
				"name": "_geoLong",
				"type": "int256"
			},
			{
				"internalType": "bool",
				"name": "_isBurnOnRead",
				"type": "bool"
			},
			{
				"internalType": "string",
				"name": "_imageHash",
				"type": "string"
			},
			{
				"internalType": "bytes",
				"name": "_signature",
				"type": "bytes"
			}
		],
		"name": "sendMessage",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_user1",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_user2",
				"type": "address"
			}
		],
		"name": "getMessages",
		"outputs": [
			{
				"components": [
					{
						"internalType": "address",
						"name": "sender",
						"type": "address"
					},
					{
						"internalType": "address",
						"name": "receiver",
						"type": "address"
					},
					{
						"internalType": "string",
						"name": "content",
						"type": "string"
					},
					{
						"internalType": "uint256",
						"name": "timestamp",
						"type": "uint256"
					},
					{
						"internalType": "bool",
						"name": "isRead",
						"type": "bool"
					},
					{
						"internalType": "uint256",
						"name": "value",
						"type": "uint256"
					},
					{
						"internalType": "bool",
						"name": "isGeoLocked",
						"type": "bool"
					},
					{
						"internalType": "int256",
						"name": "geoLat",
						"type": "int256"
					},
					{
						"internalType": "int256",
						"name": "geoLong",
						"type": "int256"
					},
					{
						"internalType": "bool",
						"name": "isBurnOnRead",
						"type": "bool"
					},
					{
						"internalType": "bool",
						"name": "isBurned",
						"type": "bool"
					},
					{
						"internalType": "string",
						"name": "imageHash",
						"type": "string"
					},
					{
						"internalType": "bytes",
						"name": "signature",
						"type": "bytes"
					}
				],
				"internalType": "struct ChainChat.Message[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_user",
				"type": "address"
			}
		],
		"name": "getUserName",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "users",
		"outputs": [
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"internalType": "bool",
				"name": "exists",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
]

const getAvatarGradient = (address) => {
  const hash = address.split("").reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  return `linear-gradient(135deg, hsl(${Math.abs(hash) % 360}, 70%, 50%), hsl(${(Math.abs(hash) % 360) + 40}, 70%, 50%))`;
};

const shortenAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

const getContactsStorageKey = (walletAddress) =>
  `chainchat_contacts_${(walletAddress || "guest").toLowerCase()}`;

const getBurnedMessagesStorageKey = (walletAddress) =>
  `chainchat_burned_${(walletAddress || "guest").toLowerCase()}`;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const buildOpenStreetMapEmbedUrl = (latitude, longitude) => {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return "https://www.openstreetmap.org/export/embed.html?bbox=-180%2C-80%2C180%2C80&layer=mapnik";
  }

  const safeLat = clamp(lat, -85, 85);
  const safeLon = clamp(lon, -180, 180);
  const latDelta = 0.01;
  const lonDelta = 0.01;

  const left = clamp(safeLon - lonDelta, -180, 180);
  const right = clamp(safeLon + lonDelta, -180, 180);
  const bottom = clamp(safeLat - latDelta, -85, 85);
  const top = clamp(safeLat + latDelta, -85, 85);

  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${safeLat}%2C${safeLon}`;
};

const buildOpenStreetMapViewUrl = (latitude, longitude) => {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return "https://www.openstreetmap.org/";
  }

  const safeLat = clamp(lat, -85, 85);
  const safeLon = clamp(lon, -180, 180);
  return `https://www.openstreetmap.org/?mlat=${safeLat}&mlon=${safeLon}#map=16/${safeLat}/${safeLon}`;
};

const readBurnedMessageKeys = (walletAddress) => {
  const storageKey = getBurnedMessagesStorageKey(walletAddress);
  const raw = localStorage.getItem(storageKey);
  if (!raw) return new Set();

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item) => typeof item === "string"));
  } catch {
    localStorage.removeItem(storageKey);
    return new Set();
  }
};

const writeBurnedMessageKeys = (walletAddress, keySet) => {
  const storageKey = getBurnedMessagesStorageKey(walletAddress);
  localStorage.setItem(storageKey, JSON.stringify(Array.from(keySet)));
};

const normalizeContacts = (contactList = []) =>
  contactList
    .filter((contact) => contact && typeof contact.address === "string")
    .map((contact) => {
      const normalizedAddress = contact.address.toLowerCase();
      return {
        id: contact.id || normalizedAddress,
        name: (contact.name || "Unnamed").trim() || "Unnamed",
        address: normalizedAddress
      };
    });

const mergeContacts = (existingContacts = [], newContacts = []) => {
  const mergedMap = new Map();

  normalizeContacts(existingContacts).forEach((contact) => {
    mergedMap.set(contact.address, contact);
  });

  normalizeContacts(newContacts).forEach((contact) => {
    const existing = mergedMap.get(contact.address);
    if (!existing) {
      mergedMap.set(contact.address, contact);
      return;
    }

    mergedMap.set(contact.address, {
      ...existing,
      name: contact.name !== "Unnamed" ? contact.name : existing.name
    });
  });

  return Array.from(mergedMap.values());
};



const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-5 border-b border-dark-700">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};



export default function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);

  const [contacts, setContacts] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [allMessages, setAllMessages] = useState([]); 
  const [messageInput, setMessageInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactAddress, setNewContactAddress] = useState("");
  
  const [registerName, setRegisterName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [geoLockEnabled, setGeoLockEnabled] = useState(false);
  const [burnOnReadEnabled, setBurnOnReadEnabled] = useState(false);
  const [receiverGeofence, setReceiverGeofence] = useState(null);
  const [geoRadiusMeters, setGeoRadiusMeters] = useState("100");
  const [isGeoProcessing, setIsGeoProcessing] = useState(false);
  const [viewerLocation, setViewerLocation] = useState(null);
  const [isLocationRefreshing, setIsLocationRefreshing] = useState(false);

  const messagesEndRef = useRef(null);
  const burnTimersRef = useRef(new Map());
  const burnedMessageKeysRef = useRef(new Set());

      // Filter messages for current chat and decrypt AES payload when allowed
      const currentChatMessages = useMemo(() => {
        if (!activeChat || !account) return [];
        const activeAddr = activeChat.address.toLowerCase();
        const myAddr = account.toLowerCase();

        return allMessages
          .filter((msg) =>
            (msg.sender.toLowerCase() === myAddr && msg.receiver.toLowerCase() === activeAddr) ||
            (msg.sender.toLowerCase() === activeAddr && msg.receiver.toLowerCase() === myAddr)
          )
          .sort((a, b) => a.timestamp - b.timestamp)
          .map((msg) => {
            if (msg.isBurned) {
              return {
                ...msg,
                displayText: "[BURNED]"
              };
            }

            const securePayload = tryParseSecurePayload(msg.text);
            if (!securePayload) {
              return { ...msg, displayText: msg.text };
            }

            const conversationKey = deriveConversationKey(msg.sender, msg.receiver);
            const geofence = securePayload.geofence || null;
            const isReceiver = msg.receiver.toLowerCase() === myAddr;
            const locationAllowed = !isReceiver || !geofence || isWithinGeofence(viewerLocation, geofence);

            if (!locationAllowed) {
              return {
                ...msg,
                isGeoLocked: true,
                displayText: `ENCRYPTED: ${securePayload.cipherText.slice(0, 28)}...`,
                geoBlocked: true
              };
            }

            const decryptedText = decryptWithAES(securePayload.cipherText, conversationKey);
            if (!decryptedText) {
              return {
                ...msg,
                displayText: `ENCRYPTED: ${securePayload.cipherText.slice(0, 28)}...`
              };
            }

            return {
              ...msg,
              isGeoLocked: Boolean(geofence),
              displayText: decryptedText,
              geoBlocked: false
            };
          });
      }, [allMessages, activeChat, account, viewerLocation]);

useEffect(() => {
  if (!account) {
    setContacts([]);
    setActiveChat(null);
    return;
  }

  const storageKey = getContactsStorageKey(account);
  const saved = localStorage.getItem(storageKey);
  const legacySaved = localStorage.getItem("chainchat_contacts");

  if (!saved && legacySaved) {
    try {
      const migratedContacts = normalizeContacts(JSON.parse(legacySaved));
      setContacts(migratedContacts);
      localStorage.setItem(storageKey, JSON.stringify(migratedContacts));
      localStorage.removeItem("chainchat_contacts");
      return;
    } catch {
      localStorage.removeItem("chainchat_contacts");
    }
  }

  if (!saved) {
    setContacts([]);
    return;
  }

  try {
    setContacts(normalizeContacts(JSON.parse(saved)));
  } catch {
    localStorage.removeItem(storageKey);
    setContacts([]);
  }
}, [account]);

useEffect(() => {
  if (!account) return;
  const storageKey = getContactsStorageKey(account);
  localStorage.setItem(storageKey, JSON.stringify(normalizeContacts(contacts)));
}, [account, contacts]);

useEffect(() => {
  if (!contract || !account || typeof contract.getMyContacts !== "function") return;

  const fetchContacts = async () => {
    try {
      const addresses = await contract.getMyContacts();
      if (!Array.isArray(addresses) || addresses.length === 0) return;

      const formatted = await Promise.all(
        addresses.map(async (addr) => {
          const normalizedAddress = addr.toLowerCase();
          const name = await contract.getUserName(addr);
          return {
            id: normalizedAddress,
            name: name || "Unnamed",
            address: normalizedAddress
          };
        })
      );

      setContacts((prev) => mergeContacts(prev, formatted));
    } catch (err) {
      console.error("Contact fetch error:", err);
    }
  };

  fetchContacts();
}, [contract, account]);



useEffect(() => {
  if (!contract || !account || !activeChat) return;

  let interval;

  const fetchMessages = async () => {
    try {
      const data = await contract.getMessages(
        account,
        activeChat.address
      );

      const formatted = data.map((msg, index) => {
        const burnKey = `${activeChat.address.toLowerCase()}::${index}`;
        const isBurned = Boolean(msg.isBurned || burnedMessageKeysRef.current.has(burnKey));

        return {
          id: index,
          sender: msg.sender,
          receiver: msg.receiver,
          text: isBurned ? "[BURNED]" : msg.content,
          timestamp: Number(msg.timestamp) * 1000,
          isRead: msg.isRead,
          value: msg.value,
          isGeoLocked: msg.isGeoLocked,
          isBurnOnRead: msg.isBurnOnRead,
          isBurned,
          status: "confirmed"
        };
      });

      setAllMessages(formatted);

    } catch (err) {
      console.error("Message fetch error:", err);
    }
  };

  fetchMessages();

  //  Poll every 4 seconds (backup)
  interval = setInterval(fetchMessages, 4000);

  return () => clearInterval(interval);

}, [contract, account, activeChat]);



useEffect(() => {
  if (!contract || !account) return;

  const handleNewMessage = async (
    from,
    to,
    value,
    timestamp,
    isGeoLocked,
    isBurnOnRead
  ) => {

    const myAddr = account.toLowerCase();

    if (
      from.toLowerCase() !== myAddr &&
      to.toLowerCase() !== myAddr
    ) return;

    toast.info("📩 New message received");

    // Refresh active chat only
    if (activeChat) {
      try {
        const data = await contract.getMessages(
          account,
          activeChat.address
        );

        const formatted = data.map((msg, index) => {
          const burnKey = `${activeChat.address.toLowerCase()}::${index}`;
          const isBurned = Boolean(msg.isBurned || burnedMessageKeysRef.current.has(burnKey));

          return {
            id: index,
            sender: msg.sender,
            receiver: msg.receiver,
            text: isBurned ? "[BURNED]" : msg.content,
            timestamp: Number(msg.timestamp) * 1000,
            isRead: msg.isRead,
            value: msg.value,
            isGeoLocked: msg.isGeoLocked,
            isBurnOnRead: msg.isBurnOnRead,
            isBurned,
            status: "confirmed"
          };
        });

        setAllMessages(formatted);

      } catch (err) {
        console.error("Realtime refresh error:", err);
      }
    }
  };

  const handleMessageBurned = async (sender, receiver) => {
    if (!activeChat) return;

    const myAddr = account.toLowerCase();
    const activeAddr = activeChat.address.toLowerCase();
    const senderAddr = sender.toLowerCase();
    const receiverAddr = receiver.toLowerCase();

    const isRelevantConversation =
      (senderAddr === myAddr && receiverAddr === activeAddr) ||
      (senderAddr === activeAddr && receiverAddr === myAddr);

    if (!isRelevantConversation) return;

    try {
      const data = await contract.getMessages(account, activeChat.address);
      const formatted = data.map((msg, index) => {
        const burnKey = `${activeChat.address.toLowerCase()}::${index}`;
        const isBurned = Boolean(msg.isBurned || burnedMessageKeysRef.current.has(burnKey));

        return {
          id: index,
          sender: msg.sender,
          receiver: msg.receiver,
          text: isBurned ? "[BURNED]" : msg.content,
          timestamp: Number(msg.timestamp) * 1000,
          isRead: msg.isRead,
          value: msg.value,
          isGeoLocked: msg.isGeoLocked,
          isBurnOnRead: msg.isBurnOnRead,
          isBurned,
          status: "confirmed"
        };
      });

      setAllMessages(formatted);
    } catch (err) {
      console.error("Realtime burn refresh error:", err);
    }
  };

  contract.on("MessageSent", handleNewMessage);
  contract.on("MessageBurned", handleMessageBurned);

  return () => {
    contract.off("MessageSent", handleNewMessage);
    contract.off("MessageBurned", handleMessageBurned);
  };

}, [contract, account, activeChat]);
  // CONNECT WALLET (Debug Version)
  const connectWallet = async () => {
    // 1. Check if Wallet is installed
    if (!window.ethereum) {
      toast.error("Wallet not found. Please use MetaMask app browser.");
      return;
    }
    
    setLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // 2. Request Account Access
      // This is where it usually fails if user rejects or app is buggy
      const accounts = await provider.send("eth_requestAccounts", []);
      
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

    const signer = await provider.getSigner();
    console.log("Contract Address Being Used:", CONTRACT_ADDRESS);
    console.log("Starts with 0x?", CONTRACT_ADDRESS?.startsWith("0x"));

    const _contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);


      setAccount(accounts[0].toLowerCase());
      setContract(_contract);

      // 3. Check Registration
      try {
        const user = await _contract.users(accounts[0]);
        // Handle Struct return (Ethers v6 returns array-like structs)
        const exists = user.exists || user[1]; 
        
        if (exists) {
          setIsRegistered(true);
          toast.success("Wallet Connected!");
        } else {
          setIsRegistered(false);
          toast.info("Please Register to continue");
        }
      } catch (err) {
        console.warn("User check failed (likely not registered):", err);
        setIsRegistered(false); // Default to not registered if check fails
      }
      
    } catch (err) {
      console.error("Detailed Connection Error:", err);

      // --- SPECIFIC ERROR HANDLING ---
      
      // Error 4001: User clicked "Reject" in MetaMask
      if (err.code === 4001 || (err.info && err.info.error && err.info.error.code === 4001)) {
        toast.warn("You rejected the connection request.");
      } 
      // Error -32002: A popup is already open and waiting for you
      else if (err.code === -32002) {
        toast.info("Check your wallet. A connection request is already pending.");
      } 
      // Network Error
      else if (err.code === "NETWORK_ERROR") {
        toast.error("Network error. Check your internet or RPC URL.");
      }
      // Catch-all for other errors
      else {
        // Show the actual error message
        toast.error("Connection Error: " + (err.reason || err.message || "Unknown"));
      }
      
    } finally {
      setLoading(false);
    }
  };

    // REGISTER USER (FINAL FIXED VERSION)
    const GAS_REGISTER = 250000;

const handleRegister = async () => {
  if (!registerName.trim()) {
    toast.warn("Enter a name");
    return;
  }

  if (!contract || !account) {
    toast.error("Wallet not connected");
    return;
  }

  setIsRegistering(true);

  try {
    console.log("📝 Registering user with name:", registerName);

    // 🔒 1️⃣ PRE-CHECK: already registered?
   const existingUser = await contract.users(account);

    if (existingUser.exists || existingUser[1]) {
      toast.warn("You are already registered");
      return;
    }
    const tx = await contract.register(registerName.trim(), {
      gasLimit: GAS_REGISTER
    });

    toast.info("⏳ Registering on blockchain...");
    await tx.wait();

    toast.success("✅ Registered successfully!");

    // 🔄 3️⃣ Re-validate on-chain state
    const updatedUser = await contract.users(account);
    if (!updatedUser[1]) {
      throw new Error("Registration failed on-chain");
    }

    // ✅ 4️⃣ Update UI
    setIsRegistered(true);
    toast.success("✅ Profile created successfully!");

  } catch (err) {
    console.error("❌ Registration Error:", err);

    // ❌ User rejected
    if (err.code === 4001 || err.code === "ACTION_REJECTED") {
      toast.warn("Transaction rejected");
    }
    // ❌ Contract revert (most important)
    else if (err.reason) {
      toast.error(err.reason);
    }
    // ❌ Deep MetaMask error
    else if (err?.info?.error?.message) {
      toast.error(err.info.error.message);
    }
    else {
      toast.error("Transaction failed");
    }
  } finally {
    setIsRegistering(false);
  }
};
const handleAddContact = () => {
  if (!newContactName.trim() || !newContactAddress.trim()) {
    toast.error("Please fill all fields");
    return;
  }

  const rawAddress = newContactAddress.trim();

  if (!rawAddress.toLowerCase().startsWith("0x")) {
    toast.error("Invalid address format");
    return;
  }

  const normalizedAddress = rawAddress.toLowerCase();
  const normalizedName = newContactName.trim();

  setContacts((prev) => {
    const existingIndex = prev.findIndex(
      (contact) => contact.address?.toLowerCase() === normalizedAddress
    );

    if (existingIndex >= 0) {
      const updated = [...prev];
      updated[existingIndex] = {
        ...updated[existingIndex],
        id: updated[existingIndex].id || normalizedAddress,
        name: normalizedName,
        address: normalizedAddress
      };
      return updated;
    }

    return [
      ...prev,
      {
        id: normalizedAddress,
        name: normalizedName,
        address: normalizedAddress
      }
    ];
  });

  toast.success("Contact added!");

  setNewContactName("");
  setNewContactAddress("");
  setIsAddContactOpen(false);
};

const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not available on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => reject(new Error(error.message || "Unable to access location.")),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });

const setReceiverGeofenceFromCurrentLocation = async () => {
  try {
    setIsLocationRefreshing(true);
    const position = await getCurrentPosition();
    setReceiverGeofence({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    });
    toast.success("Receiver geofence set to your current location.");
  } catch (error) {
    toast.error(error.message || "Unable to set receiver geofence.");
  } finally {
    setIsLocationRefreshing(false);
  }
};

const refreshViewerLocation = async () => {
  try {
    setIsLocationRefreshing(true);
    const position = await getCurrentPosition();
    setViewerLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy
    });
  } catch (error) {
    toast.error(error.message || "Unable to refresh location for decryption.");
  } finally {
    setIsLocationRefreshing(false);
  }
};

const parsePositiveNumber = (value, label) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
  return parsed;
};

const toSolidityGeoValue = (decimalCoordinate) => Math.round(decimalCoordinate * 1_000_000);


  
const sendMessage = async () => {
  if (!messageInput.trim() || !activeChat || !contract || !account) return;

  const textToSend = messageInput.trim();
  let tempId = null;

  try {
    let isGeoLocked = false;
    let geoLat = 0;
    let geoLong = 0;
    const isBurnOnRead = burnOnReadEnabled;
    const imageHash = "";
    const signature = "0x";
    let secureContent = textToSend;

    if (geoLockEnabled) {
      setIsGeoProcessing(true);
      if (!receiverGeofence) {
        throw new Error("Set receiver geofence location before sending.");
      }

      const targetLat = Number(receiverGeofence.latitude);
      const targetLng = Number(receiverGeofence.longitude);

      if (!Number.isFinite(targetLat) || !Number.isFinite(targetLng)) {
        throw new Error("Receiver geofence location is invalid.");
      }

      isGeoLocked = true;
      geoLat = toSolidityGeoValue(targetLat);
      geoLong = toSolidityGeoValue(targetLng);
    }

    const conversationKey = deriveConversationKey(account, activeChat.address);
    const cipherText = encryptWithAES(textToSend, conversationKey);
    const geofencePayload = isGeoLocked
      ? {
          latitude: Number(receiverGeofence.latitude),
          longitude: Number(receiverGeofence.longitude),
          radiusMeters: parsePositiveNumber(geoRadiusMeters, "Radius")
        }
      : null;
    secureContent = encodeSecurePayload({
      cipherText,
      geofence: geofencePayload
    });

    // Check balance safely (ethers v6)
    const provider = contract.runner?.provider;
    if (!provider) throw new Error("Provider unavailable");
    const balance = await provider.getBalance(account);
    if (balance === 0n) throw new Error("INSUFFICIENT_FUNDS");

    //  Check recipient registered
    const recipientProfile = await contract.users(activeChat.address);
    if (!recipientProfile.exists && !recipientProfile[1]) {
      throw new Error("RECIPIENT_NOT_REGISTERED");
    }

    setMessageInput("");
    tempId = Date.now();
    const optimisticMsg = {
      id: tempId,
      sender: account,
      receiver: activeChat.address,
      text: secureContent,
      timestamp: Date.now(),
      status: "sending",
      isGeoLocked,
      isBurnOnRead,
      isBurned: false
    };
    setAllMessages(prev => [...prev, optimisticMsg]);

    const tx = await contract.sendMessage(
      activeChat.address,
      secureContent,
      isGeoLocked,
      geoLat,
      geoLong,
      isBurnOnRead,
      imageHash,
      signature,
      {
        gasLimit: 800000 // safer for complex struct
        // value: ethers.parseEther("0.01") // optional ETH send
      }
    );

    setAllMessages(prev =>
      prev.map(m => m.id === tempId ? { ...m, status: "sent" } : m)
    );

    toast.info("Sending transaction...");
    await tx.wait();

    setAllMessages(prev =>
      prev.map(m => m.id === tempId ? { ...m, status: "confirmed" } : m)
    );

    toast.success("Sent!");

  } catch (err) {
    console.error("Send Error:", err);

    if (tempId) {
      setAllMessages(prev =>
        prev.map(m => m.id === tempId ? { ...m, status: "failed" } : m)
      );
    }

    const msg = (err.reason || err.message || "").toLowerCase();

    if (msg.includes("recipient")) toast.error("Recipient not registered!");
    else if (msg.includes("funds")) toast.error("No Gas (ETH)!");
    else if (
      msg.includes("geo") ||
      msg.includes("location") ||
      msg.includes("latitude") ||
      msg.includes("longitude") ||
      msg.includes("receiver geofence")
    ) {
      toast.error(err.reason || err.message || "Geofence validation failed.");
    }
    else toast.error("Transaction Failed");
  } finally {
    setIsGeoProcessing(false);
  }
};

useEffect(() => {
  if (!activeChat || !account) return;
  refreshViewerLocation();
}, [activeChat, account]);

useEffect(() => {
  if (!contract || !account || !activeChat) return;

  const myAddress = account.toLowerCase();
  const activeAddress = activeChat.address.toLowerCase();

  currentChatMessages.forEach((msg) => {
    const isReceiver = msg.receiver?.toLowerCase() === myAddress;
    const messageIndex = Number(msg.id);
    const burnKey = `${activeAddress}::${messageIndex}`;

    if (msg.isBurned) {
      const pendingTimer = burnTimersRef.current.get(burnKey);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        burnTimersRef.current.delete(burnKey);
      }
      burnedMessageKeysRef.current.add(burnKey);
      writeBurnedMessageKeys(account, burnedMessageKeysRef.current);
      return;
    }

    if (!isReceiver || msg.status !== "confirmed" || !msg.isBurnOnRead || msg.geoBlocked) return;
    if (!Number.isInteger(messageIndex) || messageIndex < 0) return;
    if (burnTimersRef.current.has(burnKey) || burnedMessageKeysRef.current.has(burnKey)) return;

    const timeoutId = setTimeout(async () => {
      burnTimersRef.current.delete(burnKey);
      burnedMessageKeysRef.current.add(burnKey);
      writeBurnedMessageKeys(account, burnedMessageKeysRef.current);

      // Optimistically hide plaintext as soon as burn timer completes.
      setAllMessages((prev) =>
        prev.map((item) =>
          Number(item.id) === messageIndex
            ? {
                ...item,
                isBurned: true,
                text: "[BURNED]"
              }
            : item
        )
      );

      try {
        const tx = await contract.burnMessage(activeChat.address, messageIndex, {
          gasLimit: 300000
        });
        await tx.wait();
      } catch (error) {
        console.error("Burn on read transaction failed:", error);
      }
    }, 2000);

    burnTimersRef.current.set(burnKey, timeoutId);
  });
}, [contract, account, activeChat, currentChatMessages]);

useEffect(() => {
  return () => {
    burnTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    burnTimersRef.current.clear();
  };
}, []);

useEffect(() => {
  if (!account) {
    burnedMessageKeysRef.current.clear();
    return;
  }

  burnedMessageKeysRef.current = readBurnedMessageKeys(account);
}, [account]);


  // AUTO SCROLL TO BOTTOM
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChatMessages, activeChat]);
  
  // RENDER
  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
        <ToastContainer theme="dark" />
        <div className="bg-dark-800 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-dark-700 text-center">
          <div className="w-20 h-20 bg-brand-600 rounded-2xl mx-auto flex items-center justify-center mb-6 rotate-3">
            <Shield size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">CypherChat</h1>
          <p className="text-gray-400 mb-8">Secure Blockchain Messaging</p>
          <button onClick={connectWallet} disabled={loading} className="w-full bg-white text-dark-900 p-4 rounded-xl flex items-center justify-center gap-3 font-bold hover:bg-gray-100 transition-all">
            {loading ? <Loader2 className="animate-spin" /> : <Wallet />}
            <span>Connect MetaMask</span>
          </button>
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
        <ToastContainer theme="dark" />
        <div className="bg-dark-800 p-8 rounded-3xl w-full max-w-md border border-dark-700 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Create Profile</h2>
          <p className="text-gray-400 mb-6 text-sm">Register on CypherChat to continue.</p>
          <input className="w-full bg-dark-900 border border-dark-700 rounded-xl p-4 text-white mb-4 focus:border-brand-500 outline-none" placeholder="Display Name" value={registerName} onChange={(e) => setRegisterName(e.target.value)} />
          <button onClick={handleRegister} disabled={isRegistering} className="w-full bg-brand-600 hover:bg-brand-500 text-white p-4 rounded-xl font-bold flex justify-center gap-2">
            {isRegistering ? <Loader2 className="animate-spin" /> : "Register"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-dark-900 overflow-hidden relative font-sans text-gray-100">
      <ToastContainer theme="dark" position="top-center" autoClose={3000} />

      {/* SIDEBAR */}
      <div className={`fixed inset-y-0 left-0 z-30 w-full md:w-80 bg-dark-800 border-r border-dark-700 flex flex-col transition-transform duration-300 ${activeChat ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
        <div className="p-4 h-16 flex items-center justify-between border-b border-dark-700 bg-dark-800">
          <div className="flex items-center gap-2 font-bold text-lg">
             <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center"><Shield size={18}/></div>
             CypherChat
          </div>
          <div className="text-xs font-mono text-gray-500 bg-dark-900 px-2 py-1 rounded">{shortenAddress(account)}</div>
        </div>

        <div className="p-4"><input className="w-full bg-dark-900 border border-dark-700 rounded-xl py-2 px-4 text-sm outline-none focus:border-brand-500" placeholder="Search..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} /></div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {contacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(contact => (
            <div key={contact.address} onClick={() => setActiveChat(contact)} className={`px-4 py-3 cursor-pointer border-l-2 hover:bg-dark-700/50 ${activeChat?.address?.toLowerCase() === contact.address?.toLowerCase() ? 'bg-dark-700/80 border-brand-500' : 'border-transparent'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md" style={{ background: getAvatarGradient(contact.address) }}>{contact.name[0]}</div>
                <div><h3 className="font-semibold text-sm">{contact.name}</h3><p className="text-xs text-gray-500 font-mono">{shortenAddress(contact.address)}</p></div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-dark-700 bg-dark-800">
           <button onClick={() => setIsAddContactOpen(true)} className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium shadow-lg transition-all"><UserPlus size={18}/> Add Contact</button>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className={`flex-1 flex flex-col h-full bg-dark-900 relative transition-transform duration-300 ${activeChat ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} md:ml-80`}>
        {activeChat ? (
          <>
            <div className="h-16 px-4 border-b border-dark-700 flex items-center justify-between bg-dark-900/95 backdrop-blur z-20">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveChat(null)} className="md:hidden text-gray-400"><ArrowLeft/></button>
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white" style={{ background: getAvatarGradient(activeChat.address) }}>{activeChat.name[0]}</div>
                <div><h2 className="font-bold text-sm">{activeChat.name}</h2><div className="text-xs text-gray-500 font-mono">{activeChat.address}</div></div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {currentChatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60">
                   <MessageSquare size={48} className="mb-4 text-brand-500/50" />
                   <p>No messages yet.</p>
                </div>
              ) : (
                currentChatMessages.map((msg, i) => {
                const isMe = msg.sender.toLowerCase() === account.toLowerCase();

                return (
                  <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm
                        ${isMe
                          ? 'bg-brand-600 text-white rounded-br-none'
                          : 'bg-dark-800 text-gray-200 border border-dark-700 rounded-bl-none'
                        }
                        ${msg.status === 'sending' ? 'opacity-70' : ''}
                        ${msg.status === 'failed' ? 'border border-red-500' : ''}
                      `}
                    >
                      <p className={msg.geoBlocked ? 'font-mono text-yellow-200 break-all' : ''}>
                        {msg.displayText ?? msg.text}
                      </p>
                      {(msg.isGeoLocked || msg.isBurnOnRead) && (
                        <div className="flex flex-wrap gap-1 mt-2 text-[10px]">
                          {msg.isGeoLocked && <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200">Geo Locked</span>}
                          {msg.isBurnOnRead && <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200">Burn on Read</span>}
                        </div>
                      )}

                      <div className="flex justify-end items-center gap-1 mt-1 text-[10px] opacity-70">
                        {format(new Date(msg.timestamp), 'hh:mm a')}

                        {msg.status === 'sending' && (
                          <Loader2 size={10} className="animate-spin" />
                        )}

                        {msg.status === 'sent' && '📤'}
                        {msg.status === 'confirmed' && '✅'}
                        {msg.status === 'failed' && '❌'}
                      </div>
                    </div>
                  </div>
                );
              })

              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-dark-900 border-t border-dark-700">
              <div className="max-w-4xl mx-auto space-y-3">
                <div className="flex flex-wrap gap-3 text-xs text-gray-300">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={geoLockEnabled}
                      onChange={(e) => setGeoLockEnabled(e.target.checked)}
                      className="accent-brand-500"
                    />
                    Geo-lock message
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={burnOnReadEnabled}
                      onChange={(e) => setBurnOnReadEnabled(e.target.checked)}
                      className="accent-brand-500"
                    />
                    Burn on read
                  </label>
                </div>

                {geoLockEnabled && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={setReceiverGeofenceFromCurrentLocation}
                        className="bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-xl px-3 py-2 text-sm"
                      >
                        {isLocationRefreshing ? "Setting geofence..." : "Set Receiver Geofence to My Current Location"}
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={geoRadiusMeters}
                        onChange={(e) => setGeoRadiusMeters(e.target.value)}
                        placeholder="Radius (m)"
                        className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-sm focus:border-brand-500 outline-none"
                      />
                      <div className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-xs text-gray-300">
                        {receiverGeofence
                          ? `Target: ${receiverGeofence.latitude.toFixed(6)}, ${receiverGeofence.longitude.toFixed(6)}`
                          : "Geofence target not set"}
                      </div>
                    </div>

                    {receiverGeofence && (
                      <div className="space-y-2">
                        <div className="rounded-xl overflow-hidden border border-dark-700 bg-dark-800">
                          <iframe
                            title="Receiver geofence map preview"
                            src={buildOpenStreetMapEmbedUrl(
                              receiverGeofence.latitude,
                              receiverGeofence.longitude
                            )}
                            className="w-full h-56 border-0"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        </div>
                        <a
                          href={buildOpenStreetMapViewUrl(
                            receiverGeofence.latitude,
                            receiverGeofence.longitude
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block text-xs text-brand-400 hover:text-brand-300"
                        >
                          Open full map view
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={refreshViewerLocation}
                    className="bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-xl px-3 py-2 text-xs text-gray-300"
                  >
                    {isLocationRefreshing ? "Refreshing location..." : "Refresh My Location for Decryption"}
                  </button>
                </div>

                <div className="flex gap-3">
                  <input type="text" value={messageInput} onChange={e => setMessageInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." className="flex-1 bg-dark-800 border border-dark-700 rounded-full px-5 py-3 focus:border-brand-500 outline-none text-white"/>
                  <button onClick={sendMessage} disabled={isGeoProcessing || (geoLockEnabled && !receiverGeofence)} className="bg-brand-600 hover:bg-brand-500 disabled:opacity-60 disabled:cursor-not-allowed text-white p-3 rounded-full">
                    {isGeoProcessing ? <Loader2 size={20} className="animate-spin" /> : <Send size={20}/>}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center text-gray-500"><MessageSquare size={48} className="mb-4 text-brand-500/50"/><p>Select a contact to chat</p></div>
        )}
      </div>

      <Modal isOpen={isAddContactOpen} onClose={() => setIsAddContactOpen(false)} title="Add Contact">
        <input className="w-full bg-dark-900 border border-dark-700 rounded-lg p-3 mb-3 text-white outline-none focus:border-brand-500" placeholder="Name" value={newContactName} onChange={e => setNewContactName(e.target.value)}/>
        <input className="w-full bg-dark-900 border border-dark-700 rounded-lg p-3 mb-4 text-white outline-none focus:border-brand-500 font-mono text-sm" placeholder="Address (0x...)" value={newContactAddress} onChange={e => setNewContactAddress(e.target.value)}/>
        <button onClick={handleAddContact} className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl">Save</button>
      </Modal>
    </div>
  );
}
