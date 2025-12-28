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

  // POLL MESSAGES
  useEffect(() => {
    if (!contract || !account) return;

    const fetchHistory = async () => {
      try {
        const data = await contract.getUserMessages();
        const formatted = data.map(msg => ({
          sender: msg.sender,
          receiver: msg.receiver,
          text: msg.content,
          timestamp: Number(msg.timestamp) * 1000,
          pending: false
        }));

        if (formatted.length !== allMessages.filter(m => !m.pending).length) {
          setAllMessages(prev => {
             const pending = prev.filter(m => m.pending);
             return [...formatted, ...pending];
          });
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 2000); 
    return () => clearInterval(interval);
  }, [contract, account]);

  // CONNECT WALLET
  const connectWallet = async () => {
    if (!window.ethereum) return toast.error("MetaMask not found!");
    setLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();

      if (network.chainId !== SEPOLIA_ID) {
        try {
          await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] });
        } catch (e) {
          toast.error("Please switch to Sepolia Network");
          setLoading(false);
          return;
        }
      }

      // Check if Contract Exists at Address
      const code = await provider.getCode(CONTRACT_ADDRESS);
      if (code === "0x") {
        toast.error("No contract found at this address!");
        console.error("The address " + CONTRACT_ADDRESS + " contains no code.");
        setLoading(false);
        return;
      }

      const signer = await provider.getSigner();
      const _contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      setAccount(accounts[0].toLowerCase());
      setContract(_contract);

      try {
        const user = await _contract.users(accounts[0]);
        if (user.exists) {
          setIsRegistered(true);
          toast.success(`Welcome back, ${user.name}`);
        } else {
          setIsRegistered(false);
          toast.info("Please create a profile");
        }
      } catch (err) {
        console.error("User Check Error:", err);
        toast.error("Could not check registration");
      }
      
    } catch (err) {
      console.error(err);
      toast.error("Connection Failed");
    } finally {
      setLoading(false);
    }
  };

  // REGISTER USER
  const handleRegister = async () => {
    if (!registerName.trim()) return toast.warn("Enter a name");
    setIsRegistering(true);
    try {
      const tx = await contract.registerUser(registerName);
      toast.info("Registering... please wait");
      await tx.wait();
      setIsRegistered(true);
      toast.success("Profile Created!");
    } catch (err) {
      console.error(err);
      toast.error(err.reason || "Registration failed");
    } finally {
      setIsRegistering(false);
    }
  };

  // SEND MESSAGE
  const sendMessage = async () => {
    if (!messageInput.trim() || !activeChat) return;
    
    const textToSend = messageInput;
    setMessageInput(""); 

    const tempMsg = {
      sender: account,
      receiver: activeChat.address,
      text: textToSend,
      timestamp: Date.now(),
      pending: true
    };
    setAllMessages(prev => [...prev, tempMsg]);
    
    try {
      const recipientProfile = await contract.users(activeChat.address);
      if (!recipientProfile.exists) throw new Error("RECIPIENT_NOT_REGISTERED");

      const tx = await contract.sendMessage(activeChat.address, textToSend);
      toast.info("Sending...");
      await tx.wait();
      toast.success("Sent!");
      
    } catch (err) {
      console.error("Send Error:", err);
      setAllMessages(prev => prev.filter(m => m !== tempMsg)); 
      setMessageInput(textToSend);

      if (err.message.includes("RECIPIENT_NOT_REGISTERED")) {
        toast.error("User not registered!");
      } else {
        toast.error("Transaction failed");
      }
    }
  };

  const handleAddContact = () => {
    if (!newContactName || !newContactAddress) return toast.warn("Fill all fields");
    if (!ethers.isAddress(newContactAddress)) return toast.error("Invalid Address");
    
    const newContact = {
      id: Date.now(),
      name: newContactName,
      address: newContactAddress.toLowerCase(),
      addedAt: Date.now()
    };

    const updated = [...contacts, newContact];
    setContacts(updated);
    localStorage.setItem('chainchat_contacts', JSON.stringify(updated));
    setIsAddContactOpen(false);
    setNewContactName("");
    setNewContactAddress("");
    toast.success("Contact Saved");
  };

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