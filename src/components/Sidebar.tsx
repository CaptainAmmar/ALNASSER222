import React, { useState, useEffect } from 'react';
import { 
  Home, Ship, FileText, Settings, Users, Truck, 
  Trash2, Bell, LogOut, Menu, X, User as UserIcon,
  MessageSquare, AlertCircle, BarChart3, ChevronRight,
  Plus, Edit, Trash, Download, FileSpreadsheet, FileJson
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '../types';
import { ConfirmModal } from './ConfirmModal';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  active?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, onClick, active }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full px-4 py-3 text-sm font-medium transition-colors rounded-lg gap-3",
      active 
        ? "bg-blue-600 text-white shadow-md" 
        : "text-slate-600 hover:bg-slate-100 hover:text-blue-600"
    )}
  >
    <Icon size={20} />
    <span>{label}</span>
  </button>
);

export const Sidebar: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  activeTab: string; 
  onTabChange: (tab: string) => void;
}> = ({ isOpen, onClose, activeTab, onTabChange }) => {
  const { profile, logout } = useAuth();
  const isManager = profile?.role === 'manager';
  const [onlineUsers, setOnlineUsers] = useState<UserProfile[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  useEffect(() => {
    if (!isManager) return;
    
    const q = query(collection(db, 'users'), where('isOnline', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      setOnlineUsers(users.filter(u => u.id !== profile?.id));
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Permission denied for online users sync in sidebar.");
      } else {
        console.error("Sidebar online users sync error:", error);
      }
    });

    return () => unsubscribe();
  }, [isManager, profile?.id]);

  const menuItems = (() => {
    if (profile?.role === 'manager') {
      return [
        { id: 'profile', label: 'الملف الشخصي', icon: UserIcon },
        { id: 'home', label: 'الصفحة الرئيسية', icon: Home },
        { id: 'vessels', label: 'البواخر', icon: Ship },
        { id: 'bl', label: 'البوالص', icon: FileText },
        { id: 'customs', label: 'البيانات الجمركية', icon: FileText },
        { id: 'operations', label: 'عمليات التشغيل', icon: BarChart3 },
        { id: 'customsItems', label: 'البنود الجمركية', icon: FileText },
        { id: 'reports', label: 'التقارير', icon: BarChart3 },
        { id: 'trucks', label: 'السيارات', icon: Truck },
        { id: 'employees', label: 'الموظفين', icon: Users },
        { id: 'recycle', label: 'سجل المحذوفات', icon: Trash2 },
        { id: 'settings', label: 'الإعدادات', icon: Settings },
      ];
    } else if (profile?.role === 'agency_employee') {
      return [
        { id: 'profile', label: 'الملف الشخصي', icon: UserIcon },
        { id: 'home', label: 'الصفحة الرئيسية', icon: Home },
        { id: 'vessels', label: 'البواخر', icon: Ship },
        { id: 'bl', label: 'البوالص', icon: FileText },
        { id: 'reports', label: 'التقارير', icon: BarChart3 },
      ];
    } else if (profile?.role === 'shipping_employee') {
      return [
        { id: 'profile', label: 'الملف الشخصي', icon: UserIcon },
        { id: 'home', label: 'الصفحة الرئيسية', icon: Home },
        { id: 'operations', label: 'عمليات التشغيل', icon: BarChart3 },
        { id: 'trucks', label: 'السيارات', icon: Truck },
        { id: 'reports', label: 'التقارير', icon: BarChart3 },
      ];
    } else if (profile?.role === 'customs_employee') {
      return [
        { id: 'profile', label: 'الملف الشخصي', icon: UserIcon },
        { id: 'home', label: 'الصفحة الرئيسية', icon: Home },
        { id: 'customs', label: 'البيانات الجمركية', icon: FileText },
        { id: 'customsItems', label: 'البنود الجمركية', icon: FileText },
        { id: 'reports', label: 'التقارير', icon: BarChart3 },
      ];
    }
    return [
      { id: 'home', label: 'الصفحة الرئيسية', icon: Home },
      { id: 'operations', label: 'عمليات التفريغ و التحميل', icon: BarChart3 },
      { id: 'trucks', label: 'السيارات', icon: Truck },
    ];
  })();

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Content */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-72 bg-white border-l shadow-2xl overflow-y-auto transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full",
          "lg:translate-x-0 lg:static lg:shadow-none"
        )}
      >
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center justify-between mb-8 px-2">
            <h2 className="text-xl font-bold text-blue-900">وكالة الناصر</h2>
            <button onClick={onClose} className="lg:hidden text-slate-500">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 space-y-1">
            {menuItems.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.id}
                onClick={() => {
                  onTabChange(item.id);
                  onClose();
                }}
              />
            ))}

            {isManager && onlineUsers.length > 0 && (
              <div className="pt-6 pb-2 px-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">الموظفون المتصلون</h3>
                <div className="space-y-2">
                  {onlineUsers.map(user => (
                    <div key={user.id} className="flex items-center gap-2 group">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">
                          {user.name?.charAt(0) || '?'}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{user.name || 'موظف'}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {user.role === 'manager' ? 'مدير' : 
                           user.role === 'agency_employee' ? 'موظف الوكالة' : 
                           user.role === 'shipping_employee' ? 'موظف قسم الشحن' : 
                           user.role === 'customs_employee' ? 'موظف الجمارك' : 'موظف'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 transition-colors rounded-lg gap-3 hover:bg-red-50"
            >
              <LogOut size={20} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="تأكيد تسجيل الخروج"
        message="هل أنت متأكد من رغبتك في تسجيل الخروج من النظام؟"
        confirmText="خروج"
        cancelText="إلغاء"
        type="warning"
      />
    </>
  );
};
