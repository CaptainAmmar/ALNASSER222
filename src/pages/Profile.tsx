import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Input, Button } from '../components/Form';
import { User, Mail, Phone, Camera, Save } from 'lucide-react';
import { motion } from 'motion/react';

export const Profile: React.FC = () => {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    photoURL: profile?.photoURL || '',
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'users', profile.id), formData);
      toast.success('تم تحديث الملف الشخصي بنجاح');
    } catch (err) {
      console.error("Error updating profile:", err);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photoURL: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-slate-900">الملف الشخصي</h2>
        <p className="text-slate-500">إدارة معلوماتك الشخصية وصورة الحساب</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-8">
        {/* Photo Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-blue-100 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
              {formData.photoURL ? (
                <img src={formData.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User size={48} className="text-blue-600" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg border-2 border-white cursor-pointer hover:bg-blue-700 transition-all">
              <Camera size={20} />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-900">{profile?.name}</h3>
            <p className="text-sm text-slate-500">
              {profile?.role === 'manager' ? 'مدير النظام' : 
               profile?.role === 'agency_employee' ? 'موظف الوكالة' : 
               profile?.role === 'shipping_employee' ? 'موظف قسم الشحن' : 
               profile?.role === 'customs_employee' ? 'موظف الجمارك' : 'موظف'}
            </p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-900 font-bold mb-2">
              <User size={18} />
              <span>المعلومات الشخصية</span>
            </div>
            <Input
              label="الاسم الكامل"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="رقم الهاتف"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-blue-900 font-bold mb-2">
              <Mail size={18} />
              <span>معلومات الحساب</span>
            </div>
            <Input
              label="الايميل (لا يمكن تعديله)"
              type="email"
              value={formData.email}
              disabled
              required
            />
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <Button type="submit" className="px-10">
            <Save size={20} />
            <span>حفظ التغييرات</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
