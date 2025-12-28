import React from 'react';

const DesktopSidebar = () => {
  return (
    <div className="desktop-sidebar">
      <div className="sidebar-header">
        <h2>CypherChat</h2>
        <p>Secure Blockchain Messaging</p>
      </div>
      <div className="sidebar-menu">
        <button className="menu-item active">Messages</button>
        <button className="menu-item">Contacts</button>
        <button className="menu-item">Settings</button>
      </div>
      <div className="sidebar-footer">
        <p>Powered by Ethereum</p>
      </div>
    </div>
  );
};

export default DesktopSidebar;