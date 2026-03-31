import React, { useState } from 'react';
import { DataGrid } from '../components/DataGrid';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { Input, Select, Button } from '../components/Form';
import { useFirestore } from '../hooks/useFirestore';
import { UserProfile, UserRole, Permission } from '../types';
import { ROLES, PERMISSIONS } from '../constants';
import { toast } from 'sonner';

export const Employees: React.FC = () => {
  const { data: users, add, update, remove } = useFirestore<UserProfile>('users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    email: '',
    phone: '',
    role: 'agency_employee',
    permissions: ['read_only'],
  });

  const columns = [
    { key: 'name', label: 'الاسم' },
    { key: 'email', label: 'الايميل' },
    { key: 'phone', label: 'رقم الهاتف' },
    { 
      key: 'role', 
      label: 'الصفة الوظيفية',
      render: (val: string) => ROLES.find(r => r.value === val)?.label || val
    },
    { 
      key: 'permissions', 
      label: 'الصلاحيات',
      render: (val: string[]) => (
        <div className="flex flex-wrap gap-1">
          {val?.map(p => (
            <span key={p} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">
              {PERMISSIONS.find(perm => perm.value === p)?.label || p}
            </span>
          ))}
        </div>
      )
    },
  ];

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'agency_employee',
      permissions: ['read_only'],
    });
    setIsModalOpen(true);
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData(user);
    setIsModalOpen(true);
  };

  const handleDelete = (user: UserProfile) => {
    setDeletingUser(user);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    setIsSubmitting(true);
    try {
      await remove(deletingUser.id);
      setIsConfirmOpen(false);
      setDeletingUser(null);
      toast.success('تم حذف الموظف بنجاح');
    } catch (err) {
      console.error("Error deleting employee:", err);
      toast.error('حدث خطأ أثناء الحذف. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermissionToggle = (perm: Permission) => {
    const current = formData.permissions || [];
    if (current.includes(perm)) {
      setFormData({ ...formData, permissions: current.filter(p => p !== perm) });
    } else {
      setFormData({ ...formData, permissions: [...current, perm] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.name || !formData.email) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        await update(editingUser.id, formData);
        toast.success('تم تحديث بيانات الموظف بنجاح');
      } else {
        await add(formData as Omit<UserProfile, 'id'>);
        toast.success('تم إضافة الموظف بنجاح');
      }
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'agency_employee',
        permissions: ['read_only'],
      });
    } catch (err) {
      console.error("Error saving employee:", err);
      toast.error('حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <DataGrid
        title="إدارة الموظفين"
        columns={columns}
        data={users}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="تأكيد حذف الموظف"
        message="هل أنت متأكد من حذف هذا الموظف؟ سيتم سحب كافة صلاحياته."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'تعديل موظف' : 'إضافة موظف جديد'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="الاسم"
            value={formData.name || ''}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="الايميل"
            type="email"
            value={formData.email || ''}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Input
            label="رقم الهاتف"
            value={formData.phone || ''}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
          />
          <Select
            label="الصفة الوظيفية"
            options={ROLES}
            value={formData.role || 'employee'}
            onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
            required
          />
          
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-bold text-slate-700 block">الصلاحيات</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PERMISSIONS.map(perm => (
                <label key={perm.value} className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.permissions?.includes(perm.value as Permission)}
                    onChange={() => handlePermissionToggle(perm.value as Permission)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : (editingUser ? 'حفظ التعديلات' : 'إضافة الموظف')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
