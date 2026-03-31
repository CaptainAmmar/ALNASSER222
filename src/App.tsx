import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Layout } from './components/Layout';
import { 
  Home, Vessels, BillsOfLading, CustomsDeclarations, 
  Operations, Trucks, Employees, RecycleBin, 
  Reports, Messages, Notifications, Settings, 
  Profile, CustomsItems 
} from './pages';
import { NotificationSound } from './components/NotificationSound';
import { ErrorBoundary } from './components/ErrorBoundary';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { DEFAULT_AGENCY_SETTINGS } from './constants';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';
import { Toaster, toast } from 'sonner';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, profile, loading, isAuthReady, quotaExceeded, resetQuota } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [agencySettings, setAgencySettings] = useState(DEFAULT_AGENCY_SETTINGS);
  const [localQuotaExceeded, setLocalQuotaExceeded] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (user) {
      setActiveTab('home');
    }
  }, [user?.uid]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading || !isAuthReady) {
      timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 30000); // 30 seconds timeout
    } else {
      setLoadingTimeout(false);
    }
    return () => clearTimeout(timer);
  }, [loading, isAuthReady]);

  const handleRetry = () => {
    setLocalQuotaExceeded(false);
    resetQuota();
    window.location.reload();
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'agency'), (snap) => {
      if (snap.exists()) {
        setAgencySettings({ ...DEFAULT_AGENCY_SETTINGS, ...snap.data() });
      }
    }, (error) => {
      if (error.code === 'resource-exhausted') {
        setLocalQuotaExceeded(true);
        toast.error('عذراً، تم تجاوز حصة الاستخدام اليومية لقاعدة البيانات. يرجى المحاولة لاحقاً.');
      } else if (error.code === 'permission-denied') {
        try {
          handleFirestoreError(error, OperationType.GET, 'settings/agency');
        } catch (e) {
          console.error("Permission denied for settings/agency:", e);
        }
      }
    });
    return () => unsub();
  }, []);

  const isQuotaExceeded = quotaExceeded || localQuotaExceeded;

  if (!isAuthReady || loading) {
    if (loadingTimeout) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-right font-sans" dir="rtl">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
              <RefreshCw size={40} className="animate-spin-slow" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">استغرق التحميل وقتاً طويلاً</h2>
              <p className="text-slate-500 leading-relaxed">
                يبدو أن هناك مشكلة في الاتصال أو تأخر في استجابة الخادم. يرجى محاولة إعادة تحميل الصفحة أو التحقق من اتصال الإنترنت.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} />
                إعادة تحميل الصفحة
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all text-sm"
              >
                مسح التخزين المؤقت وإعادة المحاولة
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <WelcomeScreen settings={agencySettings} />;
  }

  if (isQuotaExceeded && !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
            <AlertTriangle size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">تجاوز حصة الاستخدام</h2>
            <p className="text-slate-500 leading-relaxed">
              عذراً، لا يمكن تحميل بيانات حسابك حالياً بسبب تجاوز الحد الأقصى للعمليات المجانية اليومية في قاعدة البيانات.
            </p>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 text-sm text-amber-800 text-right space-y-2">
            <p className="font-bold">لحل هذه المشكلة بشكل نهائي:</p>
            <p className="opacity-90">
              يرجى ترقية المشروع إلى خطة 
              <a href="https://console.firebase.google.com/project/_/usage/details" target="_blank" rel="noopener noreferrer" className="mx-1 underline font-bold hover:text-amber-900">Blaze</a> 
              من لوحة تحكم Firebase لجعل الحصة مفتوحة وغير مقيدة.
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <Home />;
      case 'vessels': return <Vessels />;
      case 'bl': return <BillsOfLading />;
      case 'customs': return <CustomsDeclarations />;
      case 'operations': return <Operations />;
      case 'trucks': return <Trucks />;
      case 'employees': return <Employees />;
      case 'recycle': return <RecycleBin />;
      case 'reports': return <Reports />;
      case 'messages': return <Messages />;
      case 'notifications': return <Notifications />;
      case 'settings': return <Settings />;
      case 'profile': return <Profile />;
      case 'customsItems': return <CustomsItems />;
      default: return <Home />;
    }
  };

  const getTitle = () => {
    const titles: Record<string, string> = {
      home: 'الصفحة الرئيسية',
      vessels: 'إدارة البواخر',
      bl: 'إدارة البوالص',
      customs: 'البيانات الجمركية',
      operations: 'عمليات التشغيل',
      trucks: 'إدارة السيارات',
      employees: 'إدارة الموظفين',
      recycle: 'سجل المحذوفات',
      reports: 'التقارير والإحصائيات',
      messages: 'إرسال التعليمات',
      notifications: 'التنبيهات',
      settings: 'إعدادات الوكالة',
      profile: 'الملف الشخصي',
      customsItems: 'البنود الجمركية',
    };
    return titles[activeTab] || 'وكالة الناصر';
  };

  return (
    <>
      <Toaster position="top-center" richColors duration={1000} />
      {isQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 p-4 sticky top-0 z-[100] shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-amber-800">
              <AlertTriangle size={24} className="shrink-0" />
              <div className="space-y-1">
                <p className="font-black text-lg">تنبيه: تم تجاوز حصة الاستخدام اليومية</p>
                <p className="text-sm opacity-90">
                  لقد وصلت قاعدة البيانات إلى الحد الأقصى للعمليات المجانية اليومية. 
                  لجعل الحصة مفتوحة وغير مقيدة، يرجى ترقية المشروع إلى خطة 
                  <a href="https://console.firebase.google.com/project/_/usage/details" target="_blank" rel="noopener noreferrer" className="mx-1 underline font-bold hover:text-amber-900">Blaze (Pay-as-you-go)</a> 
                  من لوحة تحكم Firebase.
                </p>
              </div>
            </div>
            <button
              onClick={handleRetry}
              className="px-6 py-2 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all shadow-sm whitespace-nowrap"
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      )}
      <NotificationSound />
      <Layout 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        title={getTitle()}
      >
        {renderContent()}
      </Layout>
    </>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
