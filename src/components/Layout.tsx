import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  title: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, title }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" dir="rtl">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
      
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header 
          onMenuClick={() => setIsSidebarOpen(true)} 
          title={title}
          showBack={activeTab !== 'home'}
          onBack={() => onTabChange('home')}
          onNotificationClick={() => onTabChange('notifications')}
        />
        
        <main className="flex-1 p-4 overflow-y-auto lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
