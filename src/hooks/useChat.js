import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { debounce, throttle } from 'lodash';
import { useWallet } from './useWallet';
import { useResponsive } from './useResponsive';
import { config } from '../config/environment';
import { ChatContract } from '../core/blockchain/contracts/ChatContract';
import { 
  encryptMessage, 
  decryptMessage, 
  generateKeyPair 
} from '../utils/encryption';
import { 
  uploadToIPFS, 
  downloadFromIPFS,
  pinToIPFS 
} from '../services/storage/ipfs';

export const useChat = () => {
  const { account, provider, signer, isConnected, sendTransaction } = useWallet();
  const { isMobile } = useResponsive();
  
  // State
  const [chatState, setChatState] = useState({
    messages: [],
    contacts: [],
    activeContact: null,
    isLoading: false,
    isSending: false,
    hasMore: true,
    page: 0,
    pageSize: isMobile ? 10 : 20,
    searchQuery: '',
    filters: {
      unreadOnly: false,
      fromDate: null,
      toDate: null,
    },
    encryptionKeys: new Map(),
    pinnedMessages: new Set(),
    starredMessages: new Set(),
  });
  
  // Refs
  const chatContractRef = useRef(null);
  const messageQueueRef = useRef([]);
  const retryQueueRef = useRef([]);
  const subscriptionRef = useRef(null);
  
  // Initialize contract
  const initializeContract = useCallback(async () => {
    if (!signer || !config.contractAddress) {
      throw new Error('Contract not ready');
    }
    
    chatContractRef.current = new ChatContract(
      config.contractAddress,
      signer,
      {
        gasLimit: isMobile ? 300000 : 200000,
        confirmations: isMobile ? 1 : 2,
      }
    );
    
    return chatContractRef.current;
  }, [signer, isMobile]);
  
  // Load messages
  const loadMessages = useCallback(async (contactAddress, page = 0) => {
    if (!chatContractRef.current || !contactAddress) return;
    
    try {
      setChatState(prev => ({ ...prev, isLoading: true }));
      
      const messages = await chatContractRef.current.getMessages(
        account,
        contactAddress,
        page,
        chatState.pageSize
      );
      
      // Decrypt messages if encrypted
      const decryptedMessages = await Promise.all(
        messages.map(async (msg) => {
          if (msg.encrypted) {
            const key = chatState.encryptionKeys.get(contactAddress);
            if (key) {
              msg.content = await decryptMessage(msg.content, key);
            }
          }
          return msg;
        })
      );
      
      setChatState(prev => ({
        ...prev,
        messages: page === 0 ? decryptedMessages : [...prev.messages, ...decryptedMessages],
        page,
        hasMore: messages.length === chatState.pageSize,
        isLoading: false,
      }));
      
    } catch (error) {
      console.error('Failed to load messages:', error);
      setChatState(prev => ({ ...prev, isLoading: false }));
    }
  }, [account, chatState.pageSize, chatState.encryptionKeys]);
  
  // Send message
  const sendMessage = useCallback(async (content, recipient, options = {}) => {
    if (!chatContractRef.current || !content || !recipient) {
      throw new Error('Invalid message parameters');
    }
    
    const {
      encrypted = true,
      attachFile = null,
      replyTo = null,
      pin = false,
    } = options;
    
    try {
      setChatState(prev => ({ ...prev, isSending: true }));
      
      let finalContent = content;
      let fileCID = null;
      
      // Handle file attachment
      if (attachFile) {
        fileCID = await uploadToIPFS(attachFile);
        finalContent = `📎 ${fileCID}\n${content}`;
      }
      
      // Encrypt message if enabled
      if (encrypted) {
        const key = chatState.encryptionKeys.get(recipient) || await generateKeyPair();
        finalContent = await encryptMessage(finalContent, key.publicKey);
        
        if (!chatState.encryptionKeys.has(recipient)) {
          setChatState(prev => ({
            ...prev,
            encryptionKeys: new Map(prev.encryptionKeys.set(recipient, key)),
          }));
        }
      }
      
      // Send to blockchain
      const txHash = await chatContractRef.current.sendMessage(
        recipient,
        finalContent,
        {
          encrypted,
          fileCID,
          replyTo,
        }
      );
      
      // Add to local state immediately
      const newMessage = {
        id: `local_${Date.now()}`,
        sender: account,
        receiver: recipient,
        content: content,
        timestamp: Math.floor(Date.now() / 1000),
        encrypted,
        status: 'pending',
        txHash,
        fileCID,
        replyTo,
      };
      
      setChatState(prev => ({
        ...prev,
        messages: [newMessage, ...prev.messages],
        isSending: false,
      }));
      
      // Pin message if requested
      if (pin) {
        await pinMessage(newMessage.id);
      }
      
      return txHash;
      
    } catch (error) {
      setChatState(prev => ({ ...prev, isSending: false }));
      
      // Add to retry queue
      retryQueueRef.current.push({
        content,
        recipient,
        options,
        retries: 0,
      });
      
      throw error;
    }
  }, [account, chatState.encryptionKeys]);
  
  // Real-time message listener
  const setupMessageListener = useCallback(() => {
    if (!chatContractRef.current || subscriptionRef.current) return;
    
    subscriptionRef.current = chatContractRef.current.onMessage((message) => {
      if (
        message.sender === chatState.activeContact ||
        message.receiver === chatState.activeContact
      ) {
        // Add to messages
        setChatState(prev => ({
          ...prev,
          messages: [message, ...prev.messages],
        }));
        
        // Show notification
        if (message.sender !== account && !document.hasFocus()) {
          showNotification('New message', message.content.slice(0, 100));
        }
      }
    });
  }, [chatState.activeContact, account]);
  
  // Message search
  const searchMessages = useCallback(debounce((query) => {
    if (!query) {
      setChatState(prev => ({ ...prev, searchQuery: '', messages: [] }));
      loadMessages(chatState.activeContact, 0);
      return;
    }
    
    const filtered = chatState.messages.filter(msg =>
      msg.content.toLowerCase().includes(query.toLowerCase()) ||
      msg.sender.toLowerCase().includes(query.toLowerCase())
    );
    
    setChatState(prev => ({ ...prev, searchQuery: query, messages: filtered }));
  }, 300), [chatState.messages, chatState.activeContact, loadMessages]);
  
  // Pin message
  const pinMessage = useCallback(async (messageId) => {
    setChatState(prev => ({
      ...prev,
      pinnedMessages: new Set(prev.pinnedMessages).add(messageId),
    }));
    
    // Store in local storage
    const pinned = JSON.parse(localStorage.getItem('pinned_messages') || '[]');
    pinned.push(messageId);
    localStorage.setItem('pinned_messages', JSON.stringify(pinned));
  }, []);
  
  // Star message
  const starMessage = useCallback(async (messageId) => {
    setChatState(prev => {
      const newStarred = new Set(prev.starredMessages);
      if (newStarred.has(messageId)) {
        newStarred.delete(messageId);
      } else {
        newStarred.add(messageId);
      }
      
      return { ...prev, starredMessages: newStarred };
    });
  }, []);
  
  // Load more messages (infinite scroll)
  const loadMore = useCallback(() => {
    if (!chatState.isLoading && chatState.hasMore) {
      loadMessages(chatState.activeContact, chatState.page + 1);
    }
  }, [chatState, loadMessages]);
  
  // Mark as read
  const markAsRead = useCallback((messageIds) => {
    // Update local state
    setChatState(prev => ({
      ...prev,
      messages: prev.messages.map(msg =>
        messageIds.includes(msg.id) ? { ...msg, read: true } : msg
      ),
    }));
    
    // Update on blockchain (if feature exists)
    if (chatContractRef.current?.markAsRead) {
      chatContractRef.current.markAsRead(messageIds);
    }
  }, []);
  
  // Delete message (local only)
  const deleteMessage = useCallback((messageId) => {
    setChatState(prev => ({
      ...prev,
      messages: prev.messages.filter(msg => msg.id !== messageId),
    }));
    
    // Store in deleted cache
    const deleted = JSON.parse(localStorage.getItem('deleted_messages') || '[]');
    deleted.push(messageId);
    localStorage.setItem('deleted_messages', JSON.stringify(deleted));
  }, []);
  
  // Export chat
  const exportChat = useCallback(async () => {
    const chatData = {
      contact: chatState.activeContact,
      messages: chatState.messages,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_${chatState.activeContact}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [chatState.activeContact, chatState.messages]);
  
  // Initialize on mount
  useEffect(() => {
    if (isConnected && signer) {
      initializeContract();
      setupMessageListener();
    }
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [isConnected, signer, initializeContract, setupMessageListener]);
  
  // Retry failed messages
  useEffect(() => {
    const retryFailedMessages = async () => {
      if (retryQueueRef.current.length === 0) return;
      
      const failed = retryQueueRef.current.shift();
      if (failed.retries < 3) {
        try {
          await sendMessage(failed.content, failed.recipient, failed.options);
        } catch (error) {
          failed.retries++;
          retryQueueRef.current.push(failed);
        }
      }
    };
    
    const interval = setInterval(retryFailedMessages, 5000);
    return () => clearInterval(interval);
  }, [sendMessage]);
  
  return {
    // State
    ...chatState,
    
    // Methods
    loadMessages,
    sendMessage,
    searchMessages,
    pinMessage,
    starMessage,
    loadMore,
    markAsRead,
    deleteMessage,
    exportChat,
    
    // Getters
    getUnreadCount: () => chatState.messages.filter(msg => !msg.read).length,
    getPinnedMessages: () => chatState.messages.filter(msg => 
      chatState.pinnedMessages.has(msg.id)
    ),
    getStarredMessages: () => chatState.messages.filter(msg => 
      chatState.starredMessages.has(msg.id)
    ),
    
    // Utilities
    formatMessageDate: (timestamp) => {
      const date = new Date(timestamp * 1000);
      return date.toLocaleString();
    },
    
    // Status
    canLoadMore: chatState.hasMore && !chatState.isLoading,
    isEncrypted: (contact) => chatState.encryptionKeys.has(contact),
  };
};