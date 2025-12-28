import React, { useState, useRef, useEffect } from 'react';

const ChatInterface = ({ 
  messages, 
  activeContact, 
  isSending, 
  onSendMessage, 
  onPinMessage, 
  onStarMessage, 
  onDeleteMessage,
  pinnedMessages,
  starredMessages,
  formatTime,
  isMobile,
  theme 
}) => {
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (messageText.trim() && activeContact) {
      onSendMessage(messageText, activeContact.address);
      setMessageText('');
      if (isMobile) {
        inputRef.current?.blur();
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`chat-interface ${theme}`}>
      {/* Chat Header */}
      <div className="chat-header">
        {activeContact && (
          <>
            <div className="contact-info">
              <img 
                src={activeContact.avatar} 
                alt={activeContact.name}
                className="contact-avatar"
              />
              <div>
                <h3>{activeContact.name}</h3>
                <p className="contact-address">{activeContact.address.slice(0, 10)}...</p>
              </div>
            </div>
            <div className="chat-actions">
              <button className="btn-icon" title="Call">
                📞
              </button>
              <button className="btn-icon" title="More options">
                ⋯
              </button>
            </div>
          </>
        )}
      </div>

      {/* Messages Container */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`message-bubble ${msg.isOwn ? 'sent' : 'received'} ${
                  msg.status === 'pending' ? 'pending' : ''
                }`}
              >
                <div className="message-content">
                  {msg.content}
                </div>
                <div className="message-meta">
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                  {msg.isOwn && (
                    <span className="message-status">
                      {msg.status === 'pending' ? '⏳' : '✓✓'}
                    </span>
                  )}
                  <div className="message-actions">
                    <button
                      onClick={() => onPinMessage(msg.id)}
                      className={`btn-icon ${pinnedMessages.includes(msg.id) ? 'active' : ''}`}
                      title="Pin message"
                    >
                      📌
                    </button>
                    <button
                      onClick={() => onStarMessage(msg.id)}
                      className={`btn-icon ${starredMessages.includes(msg.id) ? 'active' : ''}`}
                      title="Star message"
                    >
                      ⭐
                    </button>
                    {msg.isOwn && (
                      <button
                        onClick={() => onDeleteMessage(msg.id)}
                        className="btn-icon"
                        title="Delete message"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="message-input-container">
        <div className="input-actions">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="btn-icon"
            title="Emoji"
          >
            😊
          </button>
          <button className="btn-icon" title="Attach file">
            📎
          </button>
        </div>
        
        <textarea
          ref={inputRef}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          rows={isMobile ? 2 : 3}
          maxLength={500}
          className="message-input"
          disabled={isSending || !activeContact}
        />
        
        <button
          onClick={handleSend}
          disabled={!messageText.trim() || isSending || !activeContact}
          className="send-button"
        >
          {isSending ? '⏳' : '↑'}
        </button>
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="emoji-picker">
          {/* Emoji picker implementation */}
          <button onClick={() => setShowEmojiPicker(false)}>Close</button>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;