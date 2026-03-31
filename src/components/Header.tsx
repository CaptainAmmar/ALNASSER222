import React, { useState, useEffect } from 'react';
import { Menu, Bell, User as UserIcon, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from './Sidebar';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  onNotificationClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onMenuClick, 
  title, 
  showBack, 
  onBack,
  onNotificationClick 
}) => {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile) return;

    const userIds = [profile.id];
    if (profile.uid) userIds.push(profile.uid);
    if (profile.oldId) userIds.push(profile.oldId);
    if (profile.role === 'manager') userIds.push('manager_broadcast');

    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', userIds),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (err) => {
      console.error("Error fetching unread count in header:", err);
    });

    return () => unsubscribe();
  }, [profile]);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white border-b shadow-sm lg:px-8">
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuClick}
          className="p-2 transition-colors rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="القائمة الرئيسية"
        >
          <Menu size={24} />
        </button>
        
        {showBack && (
          <button
            onClick={onBack}
            className="p-2 transition-colors rounded-lg text-blue-600 hover:bg-blue-50"
            title="العودة للرئيسية"
          >
            <ArrowRight size={24} />
          </button>
        )}
        
        <h1 className="text-lg font-bold text-blue-900 lg:text-xl truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={onNotificationClick}
          className="relative p-2 transition-colors rounded-lg text-slate-600 hover:bg-slate-100"
          title="التنبيهات"
        >
          <Bell size={22} />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 border-2 border-white rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
        
        <div className="flex items-center gap-3 pl-3 border-l">
          <div className="hidden text-right lg:block">
            <p className="text-sm font-semibold text-slate-900">{profile?.name}</p>
            <p className="text-xs text-slate-500">{profile?.role === 'manager' ? 'مدير' : 'موظف'}</p>
          </div>
          <div className="w-10 h-10 overflow-hidden bg-blue-100 rounded-full border-2 border-blue-50">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt={profile.name} className="object-cover w-full h-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-blue-600">
                <UserIcon size={24} />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
