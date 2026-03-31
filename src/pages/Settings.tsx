import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Input, Button } from '../components/Form';
import { DEFAULT_AGENCY_SETTINGS } from '../constants';
import { Save, Image as ImageIcon, Globe, MapPin, Phone, Facebook, Twitter, Instagram, Linkedin, Database, Download, Upload, RefreshCw } from 'lucide-react';
import { exportToExcel, importFromExcel } from '../lib/backup';
import { motion } from 'motion/react';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState(DEFAULT_AGENCY_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'agency'), (snap) => {
      if (snap.exists()) {
        setSettings({ ...DEFAULT_AGENCY_SETTINGS, ...snap.data() });
      }
      setLoading(false);
    }, (error) => {
      if (error.code === 'resource-exhausted') {
        // Global handler in App.tsx will show the toast, but we should handle it here too
        console.error("Quota exceeded for settings/agency");
      } else if (error.code === 'permission-denied') {
        try {
          handleFirestoreError(error, OperationType.GET, 'settings/agency');
        } catch (e) {
          console.error("Permission denied for settings/agency:", e);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'agency'), settings);
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (err: any) {
      console.error("Error saving settings:", err);
      if (err.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.WRITE, 'settings/agency');
      }
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleBackup = async () => {
    setIsBackingUp(true);
    const toastId = toast.loading('جاري تحضير النسخة الاحتياطية...');
    try {
      await exportToExcel();
      toast.success('تم تصدير النسخة الاحتياطية بنجاح', { id: toastId });
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('فشل تصدير النسخة الاحتياطية', { id: toastId });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('هل أنت متأكد من استعادة البيانات؟ سيتم دمج البيانات الحالية مع بيانات الملف المرفوع.')) {
      e.target.value = '';
      return;
    }

    setIsRestoring(true);
    const toastId = toast.loading('جاري استعادة البيانات، يرجى عدم إغلاق الصفحة...');
    try {
      await importFromExcel(file);
      toast.success('تم استعادة البيانات بنجاح', { id: toastId });
      // Reload to reflect changes
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('فشل استعادة البيانات. تأكد من صحة ملف الإكسل.', { id: toastId });
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-slate-900">إعدادات الوكالة</h2>
        <p className="text-slate-500">تعديل معلومات الوكالة التي تظهر في شاشة الترحيب</p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Logo Section */}
        <div className="md:col-span-2 p-8 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center gap-6">
          <div className="relative group">
            <div className="w-48 h-48 bg-slate-50 rounded-3xl p-6 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
              {settings.logo ? (
                <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                <ImageIcon size={48} className="text-slate-300" />
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <span className="font-bold text-sm">تغيير الشعار</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </label>
          </div>
          <p className="text-xs text-slate-400">يفضل استخدام شعار بخلفية شفافة (PNG)</p>
        </div>

        {/* Basic Info */}
        <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-2 text-blue-900 font-bold mb-4">
            <Globe size={20} />
            <span>المعلومات الأساسية</span>
          </div>
          <Input
            label="اسم الوكالة"
            value={settings.name}
            onChange={e => setSettings({ ...settings, name: e.target.value })}
            required
          />
          <Input
            label="العنوان"
            value={settings.address}
            onChange={e => setSettings({ ...settings, address: e.target.value })}
            required
          />
          <Input
            label="رقم الموبايل"
            value={settings.phone}
            onChange={e => setSettings({ ...settings, phone: e.target.value })}
            required
          />
        </div>

        {/* Social Links */}
        <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-2 text-blue-900 font-bold mb-4">
            <Facebook size={20} />
            <span>روابط التواصل الاجتماعي</span>
          </div>
          <Input
            label="Facebook"
            value={settings.socialLinks.facebook}
            onChange={e => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, facebook: e.target.value } })}
          />
          <Input
            label="Twitter"
            value={settings.socialLinks.twitter}
            onChange={e => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, twitter: e.target.value } })}
          />
          <Input
            label="Instagram"
            value={settings.socialLinks.instagram}
            onChange={e => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, instagram: e.target.value } })}
          />
          <Input
            label="LinkedIn"
            value={settings.socialLinks.linkedin}
            onChange={e => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, linkedin: e.target.value } })}
          />
        </div>

        {/* Notification Settings */}
        <div className="md:col-span-2 p-6 bg-white rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-2 text-blue-900 font-bold mb-4">
            <Phone size={20} />
            <span>إعدادات التنبيهات</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="space-y-1">
              <p className="font-bold text-slate-900">نغمة التنبيه</p>
              <p className="text-xs text-slate-500">اختبار صوت التنبيه عند وصول إشعار جديد</p>
            </div>
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play();
              }}
            >
              تجربة الصوت
            </Button>
          </div>
        </div>

        {/* Database Management */}
        <div className="md:col-span-2 p-6 bg-white rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-2 text-blue-900 font-bold mb-4">
            <Database size={20} />
            <span>إدارة قاعدة البيانات</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-blue-700 font-bold">
                <Download size={18} />
                <span>نسخة احتياطية (Excel)</span>
              </div>
              <p className="text-xs text-blue-600/70 leading-relaxed">
                تصدير كافة بيانات النظام (الموظفين، البواخر، العمليات، إلخ) إلى ملف إكسل واحد.
              </p>
              <Button 
                type="button" 
                variant="secondary"
                disabled={isBackingUp}
                onClick={handleBackup}
                className="mt-auto bg-white hover:bg-blue-100"
              >
                {isBackingUp ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
                تصدير البيانات
              </Button>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-amber-700 font-bold">
                <Upload size={18} />
                <span>استعادة البيانات</span>
              </div>
              <p className="text-xs text-amber-600/70 leading-relaxed">
                استيراد البيانات من ملف إكسل تم تصديره مسبقاً. سيتم دمج البيانات مع السجلات الحالية.
              </p>
              <label className="mt-auto">
                <div className={`
                  flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer
                  ${isRestoring ? 'bg-amber-100 text-amber-400 cursor-not-allowed' : 'bg-white text-amber-700 hover:bg-amber-100 border border-amber-200'}
                `}>
                  {isRestoring ? <RefreshCw size={18} className="animate-spin" /> : <Upload size={18} />}
                  {isRestoring ? 'جاري الاستعادة...' : 'رفع ملف واستعادة'}
                </div>
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                  onChange={handleRestore}
                  disabled={isRestoring}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" className="px-12 py-4 text-lg">
            <Save size={20} />
            <span>حفظ كافة التغييرات</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
