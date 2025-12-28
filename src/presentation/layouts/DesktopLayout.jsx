import React from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import Sidebar from '../../components/navigation/Sidebar';
import TopNavigation from '../../components/navigation/TopNavigation';
import StatusBar from '../../components/status/StatusBar';
import './DesktopLayout.css';

export const DesktopLayout = ({ children }) => {
  const { theme } = useTheme();
  const { isLandscape } = useResponsive();
  
  return (
    <div className={`desktop-layout ${theme} ${isLandscape ? 'landscape' : 'portrait'}`}>
      {/* Top Navigation */}
      <TopNavigation />
      
      <div className="desktop-content">
        {/* Sidebar */}
        <aside className="desktop-sidebar">
          <Sidebar />
        </aside>
        
        {/* Main Content */}
        <main className="desktop-main">
          <div className="desktop-main-content">
            {children}
          </div>
        </main>
        
        {/* Right Sidebar (Optional) */}
        <aside className="desktop-right-sidebar">
          {/* Contacts/Status Panel */}
        </aside>
      </div>
      
      {/* Status Bar */}
      <StatusBar />
    </div>
  );
};