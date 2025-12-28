import React from 'react';

const MobileBottomNav = () => {
  return (
    <nav className="mobile-bottom-nav">
      <button className="nav-item">
        <span>💬</span>
        <small>Chats</small>
      </button>
      <button className="nav-item">
        <span>👥</span>
        <small>Contacts</small>
      </button>
      <button className="nav-item">
        <span>⚙️</span>
        <small>Settings</small>
      </button>
    </nav>
  );
};

export default MobileBottomNav;