import React from 'react';
import { 
  Facebook, Twitter, Instagram, Linkedin, 
  MapPin, Phone, LogIn, Ship 
} from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { DEFAULT_AGENCY_SETTINGS } from '../constants';
import { toast } from 'sonner';

interface WelcomeScreenProps {
  settings?: any;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ settings = DEFAULT_AGENCY_SETTINGS }) => {
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    const toastId = toast.loading('جاري الاتصال بـ Google...');
    try {
      await signInWithPopup(auth, provider);
      // Success toast removed here, AuthContext will handle it after profile verification
      toast.dismiss(toastId);
    } catch (error: any) {
      console.error("Login error details:", error);
      if (error.code === 'auth/popup-blocked') {
        toast.error('تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة من إعدادات المتصفح ثم المحاولة مرة أخرى.', { id: toastId });
      } else if (error.code === 'auth/cancelled-popup-request') {
        toast.dismiss(toastId);
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast.error('تم إغلاق نافذة تسجيل الدخول. يرجى التأكد من إكمال عملية تسجيل الدخول في النافذة المنبثقة وعدم إغلاقها يدوياً.', { id: toastId });
      } else if (error.code === 'auth/network-request-failed') {
        toast.error('خطأ في الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.', { id: toastId });
      } else if (error.code === 'auth/internal-error' || error.code === 'auth/invalid-api-key') {
        toast.error('خطأ في تهيئة النظام. يرجى التأكد من إعدادات Firebase بشكل صحيح.', { id: toastId });
      } else {
        toast.error('فشل تسجيل الدخول. يرجى التأكد من السماح بملفات تعريف الارتباط (Cookies) للجهات الخارجية في متصفحك.', { id: toastId });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen p-4 bg-slate-50 text-slate-900 overflow-hidden relative" dir="rtl">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center max-w-md w-full text-center space-y-6 z-10"
      >
        {/* Logo Container */}
        <div className="relative w-48 h-48 lg:w-64 lg:h-64 bg-white rounded-3xl p-4 shadow-2xl border border-blue-100 overflow-hidden">
          <img 
            src={settings.logo} 
            alt="Logo" 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Agency Info */}
        <div className="space-y-2">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl lg:text-4xl font-black tracking-tight text-[#1a365d]"
          >
            {settings.name}
          </motion.h1>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-1 text-slate-600"
          >
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-[#c53030]" />
              <span className="text-base lg:text-lg font-medium">{settings.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-[#2b6cb0]" />
              <span className="text-base lg:text-lg font-medium">{settings.phone}</span>
            </div>
          </motion.div>
        </div>

        {/* Social Links */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex gap-4"
        >
          {settings.socialLinks.facebook && (
            <a href={settings.socialLinks.facebook} className="p-2.5 bg-white text-[#2b6cb0] shadow-sm border border-blue-50 rounded-full hover:bg-blue-50 transition-colors">
              <Facebook size={20} />
            </a>
          )}
          {settings.socialLinks.twitter && (
            <a href={settings.socialLinks.twitter} className="p-2.5 bg-white text-[#2b6cb0] shadow-sm border border-blue-50 rounded-full hover:bg-blue-50 transition-colors">
              <Twitter size={20} />
            </a>
          )}
          {settings.socialLinks.instagram && (
            <a href={settings.socialLinks.instagram} className="p-2.5 bg-white text-[#c53030] shadow-sm border border-red-50 rounded-full hover:bg-red-50 transition-colors">
              <Instagram size={20} />
            </a>
          )}
          {settings.socialLinks.linkedin && (
            <a href={settings.socialLinks.linkedin} className="p-2.5 bg-white text-[#2b6cb0] shadow-sm border border-blue-50 rounded-full hover:bg-blue-50 transition-colors">
              <Linkedin size={20} />
            </a>
          )}
        </motion.div>

        {/* Login Button */}
        <div className="w-full space-y-3">
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="flex items-center justify-center gap-3 w-full py-3.5 px-8 bg-[#1a365d] text-white font-bold text-lg rounded-2xl shadow-xl hover:bg-[#2a4365] transition-all disabled:opacity-50 disabled:cursor-not-allowed border-b-4 border-[#0d1b2a]"
          >
            <LogIn size={22} className={isLoggingIn ? "animate-spin" : ""} />
            <span>{isLoggingIn ? 'جاري التحميل...' : 'تسجيل الدخول'}</span>
          </motion.button>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-slate-500 text-sm font-bold"
          >
            * الدخول متاح فقط للموظفين المسجلين مسبقاً في النظام
          </motion.p>
        </div>

        <p className="text-slate-400 text-xs font-medium">
          نظام إدارة العمليات التشغيلية للبواخر
        </p>
      </motion.div>

      {/* Background Decoration */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-80 h-80 bg-blue-100/40 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-80 h-80 bg-red-100/30 blur-3xl rounded-full pointer-events-none" />
      
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1a365d 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
    </div>
  );
};
