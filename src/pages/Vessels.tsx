import React, { useState } from 'react';
import { DataGrid } from '../components/DataGrid';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { Input, Select, Button } from '../components/Form';
import { useFirestore } from '../hooks/useFirestore';
import { Vessel } from '../types';
import { VESSEL_STATUS } from '../constants';
import { differenceInDays, parseISO } from 'date-fns';
import { cn } from '../components/Sidebar';
import { toast } from 'sonner';

export const Vessels: React.FC = () => {
  const { data: vessels, add, update, remove } = useFirestore<Vessel>('vessels');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingVessel, setEditingVessel] = useState<Vessel | null>(null);
  const [deletingVessel, setDeletingVessel] = useState<Vessel | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Vessel>>({
    name: '',
    manifestNumber: '',
    arrivalDate: '',
    departureDate: '',
    status: 'anchored',
    captainName: '',
    captainPhone: '',
    agentName: '',
  });

  const columns = [
    { key: 'name', label: 'اسم الباخرة' },
    { key: 'manifestNumber', label: 'رقم المانفيست' },
    { key: 'arrivalDate', label: 'تاريخ الوصول' },
    { key: 'departureDate', label: 'تاريخ المغادرة' },
    { 
      key: 'operatingDays', 
      label: 'عدد أيام التشغيل',
      render: (_: any, item: Vessel) => {
        if (item.arrivalDate && item.departureDate) {
          try {
            const start = parseISO(item.arrivalDate);
            const end = parseISO(item.departureDate);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              return differenceInDays(end, start);
            }
          } catch (e) {
            console.error("Error calculating operating days:", e);
          }
        }
        return '-';
      }
    },
    { 
      key: 'status', 
      label: 'حالة السفينة',
      render: (val: string) => {
        const status = VESSEL_STATUS.find(s => s.value === val);
        return (
          <span className={cn(
            "px-3 py-1 rounded-full text-xs font-bold",
            val === 'anchored' ? "bg-amber-100 text-amber-700" :
            val === 'operating' ? "bg-blue-100 text-blue-700" :
            "bg-slate-100 text-slate-700"
          )}>
            {status?.label || val}
          </span>
        );
      }
    },
    { key: 'captainName', label: 'اسم القبطان' },
    { key: 'captainPhone', label: 'رقم الموبايل' },
    { key: 'agentName', label: 'وكيل الباخرة' },
  ];

  const handleAdd = () => {
    setEditingVessel(null);
    setFormData({
      name: '',
      manifestNumber: '',
      arrivalDate: '',
      departureDate: '',
      status: 'anchored',
      captainName: '',
      captainPhone: '',
      agentName: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (vessel: Vessel) => {
    setEditingVessel(vessel);
    setFormData(vessel);
    setIsModalOpen(true);
  };

  const handleDelete = (vessel: Vessel) => {
    setDeletingVessel(vessel);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingVessel) return;
    setIsSubmitting(true);
    try {
      await remove(deletingVessel.id);
      setIsConfirmOpen(false);
      setDeletingVessel(null);
      toast.success('تم حذف الباخرة بنجاح');
    } catch (err) {
      console.error("Error deleting vessel:", err);
      toast.error('حدث خطأ أثناء الحذف. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      if (editingVessel) {
        await update(editingVessel.id, formData);
        toast.success('تم تحديث بيانات الباخرة بنجاح');
      } else {
        await add(formData as Omit<Vessel, 'id'>);
        toast.success('تم إضافة الباخرة بنجاح');
      }
      setIsModalOpen(false);
      setEditingVessel(null);
    } catch (err) {
      console.error("Error saving vessel:", err);
      toast.error('حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <DataGrid
        title="إدارة البواخر"
        columns={columns}
        data={vessels}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="تأكيد حذف الباخرة"
        message="هل أنت متأكد من حذف هذه الباخرة؟ سيتم حذف كافة البيانات المرتبطة بها."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVessel ? 'تعديل باخرة' : 'إضافة باخرة جديدة'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="اسم الباخرة"
            value={formData.name || ''}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="رقم المانفيست"
            value={formData.manifestNumber || ''}
            onChange={e => setFormData({ ...formData, manifestNumber: e.target.value })}
            required
          />
          <Input
            label="تاريخ الوصول"
            type="date"
            value={formData.arrivalDate || ''}
            onChange={e => setFormData({ ...formData, arrivalDate: e.target.value })}
            required
          />
          <Input
            label="تاريخ المغادرة"
            type="date"
            value={formData.departureDate || ''}
            onChange={e => setFormData({ ...formData, departureDate: e.target.value })}
          />
          <Select
            label="حالة السفينة"
            options={VESSEL_STATUS}
            value={formData.status || 'anchored'}
            onChange={e => setFormData({ ...formData, status: e.target.value as any })}
            required
          />
          <Input
            label="اسم القبطان"
            value={formData.captainName || ''}
            onChange={e => setFormData({ ...formData, captainName: e.target.value })}
          />
          <Input
            label="رقم الموبايل"
            value={formData.captainPhone || ''}
            onChange={e => setFormData({ ...formData, captainPhone: e.target.value })}
          />
          <Input
            label="وكيل الباخرة"
            value={formData.agentName || ''}
            onChange={e => setFormData({ ...formData, agentName: e.target.value })}
          />
          
          <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : (editingVessel ? 'حفظ التعديلات' : 'إضافة الباخرة')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
