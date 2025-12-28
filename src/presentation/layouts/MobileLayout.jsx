import React, { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import BottomNavigation from '../../components/navigation/BottomNavigation';
import MobileHeader from '../../components/navigation/MobileHeader';
import Swipeable from '../../components/ui/Swipeable';
import './MobileLayout.css';

export const MobileLayout = ({ children }) => {
  const { theme } = useTheme();
  const { isLandscape, safeArea } = useResponsive();
  const [activeTab, setActiveTab] = useState('chat');
  
  return (
    <div 
      className={`mobile-layout ${theme} ${isLandscape ? 'landscape' : 'portrait'}`}
      style={{
        paddingTop: safeArea.top,
        paddingBottom: safeArea.bottom,
        paddingLeft: safeArea.left,
        paddingRight: safeArea.right,
      }}
    >
      {/* Header */}
      <MobileHeader />
      
      {/* Main Content with Swipe Support */}
      <Swipeable
        onSwipeLeft={() => setActiveTab((prev) => 
          prev === 'chat' ? 'contacts' : prev === 'contacts' ? 'wallet' : 'chat'
        )}
        onSwipeRight={() => setActiveTab((prev) => 
          prev === 'wallet' ? 'contacts' : prev === 'contacts' ? 'chat' : 'wallet'
        )}
      >
        <main className="mobile-main">
          {activeTab === 'chat' && (
            <div className="mobile-chat-view">
              {children}
            </div>
          )}
          
          {activeTab === 'contacts' && (
            <div className="mobile-contacts-view">
              {/* Contacts List */}
            </div>
          )}
          
          {activeTab === 'wallet' && (
            <div className="mobile-wallet-view">
              {/* Wallet Info */}
            </div>
          )}
        </main>
      </Swipeable>
      
      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      {/* Keyboard Avoidance for iOS */}
      <div className="keyboard-avoidance" />
    </div>
  );
};