import React from 'react';

const SettingsPanel = ({
  theme,
  notifications,
  soundEnabled,
  onToggleTheme,
  onToggleNotifications,
  onToggleSound,
  onSwitchNetwork,
  networkName,
  isWrongNetwork,
  onClose
}) => {
  const settings = [
    {
      id: 'theme',
      label: 'Dark Mode',
      value: theme === 'dark',
      onChange: onToggleTheme,
      icon: theme === 'dark' ? '🌙' : '☀️'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      value: notifications,
      onChange: onToggleNotifications,
      icon: '🔔'
    },
    {
      id: 'sound',
      label: 'Sound Effects',
      value: soundEnabled,
      onChange: onToggleSound,
      icon: '🔊'
    }
  ];

  return (
    <div className="settings-panel">
      {onClose && (
        <div className="settings-header">
          <h3>Settings</h3>
          <button onClick={onClose} className="btn-icon">×</button>
        </div>
      )}
      
      <div className="settings-list">
        {settings.map(setting => (
          <div key={setting.id} className="setting-item">
            <div className="setting-info">
              <span className="setting-icon">{setting.icon}</span>
              <span className="setting-label">{setting.label}</span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={setting.value}
                onChange={setting.onChange}
              />
              <span className="slider"></span>
            </label>
          </div>
        ))}
      </div>
      
      <div className="network-section">
        <h4>Network</h4>
        <div className="network-status">
          <span className={`network-badge ${isWrongNetwork ? 'error' : 'success'}`}>
            {networkName}
          </span>
          {isWrongNetwork && (
            <button onClick={() => onSwitchNetwork('sepolia')} className="btn btn-small">
              Fix Network
            </button>
          )}
        </div>
      </div>
      
      <div className="about-section">
        <h4>About</h4>
        <p className="version">Version 1.0.0</p>
        <div className="links">
          <a href="/privacy" target="_blank">Privacy Policy</a>
          <a href="/terms" target="_blank">Terms of Service</a>
          <a href="https://github.com/yourusername/blockchain-chat" target="_blank">GitHub</a>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;