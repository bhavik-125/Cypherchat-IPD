import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ethers } from 'ethers';
import { format } from 'date-fns';
import { 
  Wallet, MessageSquare, Send, Search, ArrowLeft, 
  MoreVertical, Loader2, UserPlus, Shield, X, Copy, Check
} from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import { ethers } from "ethers";
import 'react-toastify/dist/ReactToastify.css';

// ==========================================
// 1. CONFIGURATION
// ==========================================
const CONTRACT_ADDRESS = "0xA037ca05F67E142EF88748c752B80350cb292ae6"; 

const SEPOLIA_ID = 11155111n;

// ✅ YOUR EXACT ABI (Copy-pasted from your file)
const ABI = [
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "reader",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "withUser",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "index",
				"type": "uint256"
			}
		],
		"name": "MessageRead",
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
				"name": "index",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "bytes",
				"name": "cipherText",
				"type": "bytes"
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
				"name": "user",
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
				"name": "_with",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_index",
				"type": "uint256"
			}
		],
		"name": "markAsRead",
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
				"internalType": "bytes",
				"name": "_cipherText",
				"type": "bytes"
			}
		],
		"name": "sendMessage",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_with",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_start",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_limit",
				"type": "uint256"
			}
		],
		"name": "getMessages",
		"outputs": [
			{
				"components": [
					{
						"internalType": "address",
						"name": "from",
						"type": "address"
					},
					{
						"internalType": "uint40",
						"name": "timestamp",
						"type": "uint40"
					},
					{
						"internalType": "bytes",
						"name": "cipherText",
						"type": "bytes"
					},
					{
						"internalType": "bool",
						"name": "read",
						"type": "bool"
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
		"inputs": [],
		"name": "getMyContacts",
		"outputs": [
			{
				"internalType": "address[]",
				"name": "",
				"type": "address[]"
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

// ==========================================
// 2. COMPONENTS
// ==========================================

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

// ==========================================
// 3. MAIN APP
// ==========================================

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

  const messagesEndRef = useRef(null);
    //pooling
      useEffect(() => {
        const saved = localStorage.getItem('chainchat_contacts');
        if (saved) setContacts(JSON.parse(saved));
      }, []);

      // Filter messages for current chat
      const currentChatMessages = useMemo(() => {
        if (!activeChat || !account) return [];
        const activeAddr = activeChat.address.toLowerCase();
        const myAddr = account.toLowerCase();

        return allMessages.filter(msg => 
          (msg.sender.toLowerCase() === myAddr && msg.receiver.toLowerCase() === activeAddr) ||
          (msg.sender.toLowerCase() === activeAddr && msg.receiver.toLowerCase() === myAddr)
        ).sort((a, b) => a.timestamp - b.timestamp);
      }, [allMessages, activeChat, account]);

    useEffect(() => {
      if (!contract || !account || !activeChat) return;

      const fetchHistory = async () => {
        try {
          const data = await contract.getMessages(
            account,
            activeChat.address
          );

          const formatted = data.map(msg => ({
            sender: msg.sender,
            receiver: msg.receiver,
            text: msg.content,
            timestamp: Number(msg.timestamp) * 1000,
            pending: false
          }));

          setAllMessages(formatted);
        } catch (err) {
          console.error("Message fetch error:", err);
        }
      };

      fetchHistory();
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
    if (existingUser[1]) {
      toast.warn("You are already registered");
      return;
    }

    // ⚡ 2️⃣ Force nonce + optimized gas (mobile-safe)
    const signer = await contract.runner.getSigner();
    const nonce = await signer.getNonce();

    const tx = await contract.register(registerName.trim(), {
      gasLimit: GAS_REGISTER,
      nonce
    });

    toast.info("⏳ Registering on blockchain...");
    await tx.wait();

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

  
const sendMessage = async () => {
    if (!messageInput.trim() || !activeChat) return;
  
    const textToSend = messageInput;
    setMessageInput(""); // Clear UI
  
    // A. Optimistic Update (Show "Sending" immediately)
    const tempId = Date.now();
    const optimisticMsg = {
      id: tempId,
      sender: account,
      receiver: activeChat.address,
      text: textToSend,
      timestamp: Date.now(),
      status: "sending" // ⏳ Initial State
    };
  
    setAllMessages(prev => [...prev, optimisticMsg]);
  
    try {
      // B. Mobile Check: Gas & Registration
      if (contract.runner?.provider) {
        const balance = await contract.runner.provider.getBalance(account);
        if (balance === 0n) throw new Error("INSUFFICIENT_FUNDS");
      }
      
      const recipientProfile = await contract.users(activeChat.address);
      if (!recipientProfile.exists && !recipientProfile[1]) throw new Error("RECIPIENT_NOT_REGISTERED");
  
      // C. Send Transaction (Mobile Fix: Force Gas, No Bytes conversion)
      const tx = await contract.sendMessage(
        activeChat.address,
        textToSend, 
        { gasLimit: 500000 } // <--- Force 500k gas for mobile
      );
  
      // D. Update Status -> SENT
      setAllMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "sent" } : m));
      toast.info("Sending transaction...");
  
      // E. Wait for Block
      await tx.wait();
  
      // F. Update Status -> CONFIRMED
      setAllMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "confirmed" } : m));
      toast.success("Sent!");
      
      // Optional: definitive reload
      loadMessages(contract);
  
    } catch (err) {
      console.error("Send Error:", err);
      // G. Update Status -> FAILED
      setAllMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "failed" } : m));
  
      const msg = (err.reason || err.message || "").toLowerCase();
      if (msg.includes("recipient_not_registered")) toast.error("User not registered!");
      else if (msg.includes("insufficient_funds")) toast.error("No Gas (ETH)!");
      else toast.error("Transaction Failed");
    }
  };

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
            <div key={contact.id} onClick={() => setActiveChat(contact)} className={`px-4 py-3 cursor-pointer border-l-2 hover:bg-dark-700/50 ${activeChat?.id === contact.id ? 'bg-dark-700/80 border-brand-500' : 'border-transparent'}`}>
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
                      <p>{msg.text}</p>

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
              <div className="max-w-4xl mx-auto flex gap-3">
                <input type="text" value={messageInput} onChange={e => setMessageInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." className="flex-1 bg-dark-800 border border-dark-700 rounded-full px-5 py-3 focus:border-brand-500 outline-none text-white"/>
                <button onClick={sendMessage} className="bg-brand-600 hover:bg-brand-500 text-white p-3 rounded-full"><Send size={20}/></button>
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