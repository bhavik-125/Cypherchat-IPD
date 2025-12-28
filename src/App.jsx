import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ethers } from 'ethers';
import { format } from 'date-fns';
import { 
  Wallet, MessageSquare, Send, Search, ArrowLeft, 
  MoreVertical, Loader2, UserPlus, Shield, X, Copy, Check
} from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ==========================================
// 1. CONFIGURATION
// ==========================================

// ------------------------------------------------------------------
// 🛑 IMPORTANT: PASTE YOUR DEPLOYED SMART CONTRACT ADDRESS HERE
// DO NOT PASTE YOUR WALLET ADDRESS
// ------------------------------------------------------------------
const CONTRACT_ADDRESS = "0xdE58cf41357F3aAa2892Cc50b4b3c19F9A9d470f"; 

const SEPOLIA_ID = 11155111n;

// ✅ YOUR EXACT ABI (Copy-pasted from your file)
const ABI = [
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
				"name": "timestamp",
				"type": "uint256"
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
        console.log(" Registering user with name:", registerName);

        // 1️⃣ Send transaction (manual gas avoids mobile estimation bugs)
        const tx = await contract.register(registerName, {
          gasLimit: 300000
        });

        toast.info("⏳ Transaction sent. Waiting for confirmation...");

        // 2️⃣ Wait for confirmation
        await tx.wait();

        // 3️⃣ Re-fetch user data from blockchain (SOURCE OF TRUTH)
        const updatedUser = await contract.users(account);

        // ethers v6 struct → array-based
        const exists = Boolean(updatedUser[1]);

        if (!exists) {
          throw new Error("Registration failed on-chain");
        }

        // 4️⃣ Update UI state ONLY after confirmed success
        setIsRegistered(true);
        toast.success(" Profile created successfully!");

      } catch (err) {
        console.error(" Registration Error:", err);

        // User rejected TX
        if (err.code === "ACTION_REJECTED" || err.code === 4001) {
          toast.warn("Transaction rejected");
        }
        // Contract revert reason
        else if (err.reason) {
          toast.error(`Failed: ${err.reason}`);
        }
        // Generic fallback
        else if (err.message) {
          toast.error(`Error: ${err.message.slice(0, 80)}`);
        }
        else {
          toast.error("Registration failed. Check console.");
        }

      } finally {
        setIsRegistering(false);
      }
    };

  // SEND MESSAGE
  const sendMessage = async () => {
    // 1. Validation
    if (!messageInput.trim() || !activeChat) return;

    // --- FEATURE 1: Balance Check (Prevents confusing 0 ETH errors) ---
    try {
      if (contract && contract.runner && contract.runner.provider) {
         const balance = await contract.runner.provider.getBalance(account);
         if (balance === 0n) {
           toast.error("You have 0 ETH. You need gas fees to send.");
           return;
         }
      }
    } catch (e) { console.log("Balance check skipped", e); }

    const textToSend = messageInput;
    setMessageInput(""); // Clear input immediately

    // 2. Optimistic Update (Show pending message)
    const tempMsg = {
      sender: account,
      receiver: activeChat.address,
      text: textToSend,
      timestamp: Date.now(),
      pending: true
    };
    setAllMessages(prev => [...prev, tempMsg]);
    
    // --- TRY BLOCK STARTS ---
    try {
      console.log(`Checking registration for: ${activeChat.address}`);
      
      // --- FEATURE 2: Check SENDER (You) ---
      // Fixes "Transaction Failed" if you switched accounts and forgot to register
      const senderProfile = await contract.users(account);
      const senderExists = senderProfile.exists || senderProfile[1];
      if (!senderExists) throw new Error("SENDER_NOT_REGISTERED");

      // --- FEATURE 3: Check RECEIVER ---
      // Fixes sending messages to ghosts
      const recipientProfile = await contract.users(activeChat.address);
      const recipientExists = Boolean(recipientProfile[1]);
      if (!recipientExists) throw new Error("RECIPIENT_NOT_REGISTERED");

      // --- FEATURE 4: Manual Gas Limit ---
      // Fixes Mobile Wallet crashes
      const tx = await contract.sendMessage(activeChat.address, textToSend, {
        gasLimit: 300000 
      });

      toast.info("Sending transaction...");
      await tx.wait(); // Wait for confirmation
      
      toast.success("Message Sent!");
      
    } 
    // --- CATCH BLOCK (With Safe Handling) ---
    catch (err) {
      console.error("Send Error:", err);
      
      // Revert UI (Remove the fake message)
      setAllMessages(prev => prev.filter(m => m !== tempMsg)); 
      setMessageInput(textToSend); // Put text back

      // Safe Error Extraction (Prevents crashes)
      const errorMessage = (err.reason || err.message || JSON.stringify(err)).toLowerCase();

      if (errorMessage.includes("sender_not_registered")) {
        toast.error("YOU are not registered. Please register first.");
      } 
      else if (errorMessage.includes("recipient_not_registered")) {
        toast.error("Contact is not registered on the blockchain.");
      } 
      else if (errorMessage.includes("user rejected") || err.code === "ACTION_REJECTED") {
        toast.warn("Transaction rejected.");
      } 
      else if (errorMessage.includes("insufficient funds")) {
        toast.error("Not enough ETH for gas.");
      }
      else {
        toast.error("Transaction Failed.");
      }
    }
  };
  // ADD CONTACT (Local Storage)
  const handleAddContact = () => {
    if (!newContactName || !newContactAddress) return toast.warn("Fill all fields");
    
    if (!ethers.isAddress(newContactAddress)) {
      return toast.error("Invalid Ethereum Address");
    }
    
    const newContact = {
      id: Date.now(),
      name: newContactName,
      address: newContactAddress.toLowerCase(),
      addedAt: Date.now()
    };

    // Save to State and LocalStorage
    const updated = [...contacts, newContact];
    setContacts(updated);
    localStorage.setItem('chainchat_contacts', JSON.stringify(updated));
    
    setIsAddContactOpen(false);
    setNewContactName("");
    setNewContactAddress("");
    toast.success("Contact Saved Locally");
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
                    <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isMe ? 'bg-brand-600 text-white rounded-br-none' : 'bg-dark-800 text-gray-200 border border-dark-700 rounded-bl-none'} ${msg.pending ? 'opacity-70' : ''}`}>
                        <p>{msg.text}</p>
                        <div className="flex justify-end items-center gap-1 mt-1 text-[10px] opacity-70">
                          {format(new Date(msg.timestamp), 'hh:mm a')}
                          {msg.pending && <Loader2 size={10} className="animate-spin"/>}
                        </div>
                      </div>
                    </div>
                  )
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