import React, { useState } from 'react';
import { DataGrid } from '../components/DataGrid';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { Input, Select, Button } from '../components/Form';
import { useFirestore } from '../hooks/useFirestore';
import { BillOfLading, Vessel } from '../types';
import { UNITS } from '../constants';
import { toast } from 'sonner';

export const BillsOfLading: React.FC = () => {
  const { data: bls, add, update, remove } = useFirestore<BillOfLading>('billsOfLading');
  const { data: vessels } = useFirestore<Vessel>('vessels');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBL, setEditingBL] = useState<BillOfLading | null>(null);
  const [deletingBL, setDeletingBL] = useState<BillOfLading | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<BillOfLading>>({
    number: '',
    date: '',
    vesselId: '',
    cargoType: '',
    grossWeight: 0,
    netWeight: 0,
    quantity: 0,
    unit: 'roll',
  });

  const columns = [
    { key: 'number', label: 'رقم البوليصة' },
    { key: 'date', label: 'تاريخها' },
    { 
      key: 'vesselId', 
      label: 'الباخرة',
      render: (val: string) => {
        const vessel = vessels.find(v => v.id === val);
        return vessel ? `${vessel.name} (${vessel.arrivalDate})` : val;
      }
    },
    { key: 'cargoType', label: 'نوع البضاعة' },
    { key: 'grossWeight', label: 'الوزن القائم' },
    { key: 'netWeight', label: 'الوزن الصافي' },
    { key: 'quantity', label: 'العدد' },
    { 
      key: 'unit', 
      label: 'الواحدة',
      render: (val: string) => UNITS.find(u => u.value === val)?.label || val
    },
  ];

  const handleAdd = () => {
    setEditingBL(null);
    setFormData({
      number: '',
      date: '',
      vesselId: '',
      cargoType: '',
      grossWeight: 0,
      netWeight: 0,
      quantity: 0,
      unit: 'roll',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (bl: BillOfLading) => {
    setEditingBL(bl);
    setFormData(bl);
    setIsModalOpen(true);
  };

  const handleDelete = (bl: BillOfLading) => {
    setDeletingBL(bl);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingBL) return;
    setIsSubmitting(true);
    try {
      await remove(deletingBL.id);
      setIsConfirmOpen(false);
      setDeletingBL(null);
      toast.success('تم حذف البوليصة بنجاح');
    } catch (err) {
      console.error("Error deleting BL:", err);
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
      if (editingBL) {
        await update(editingBL.id, formData);
        toast.success('تم تحديث بيانات البوليصة بنجاح');
      } else {
        await add(formData as Omit<BillOfLading, 'id'>);
        toast.success('تم إضافة البوليصة بنجاح');
      }
      setIsModalOpen(false);
      setEditingBL(null);
    } catch (err) {
      console.error("Error saving BL:", err);
      toast.error('حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const vesselOptions = vessels.map(v => ({ 
    value: v.id, 
    label: `${v.name} (${v.arrivalDate})` 
  }));

  return (
    <div className="space-y-6">
      <DataGrid
        title="إدارة البوالص"
        columns={columns}
        data={bls}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="تأكيد حذف البوليصة"
        message="هل أنت متأكد من حذف هذه البوليصة؟ سيتم حذف كافة البيانات المرتبطة بها."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBL ? 'تعديل بوليصة' : 'إضافة بوليصة جديدة'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="رقم البوليصة"
            value={formData.number || ''}
            onChange={e => setFormData({ ...formData, number: e.target.value })}
            required
          />
          <Input
            label="تاريخ البوليصة"
            type="date"
            value={formData.date || ''}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
            required
          />
          <Select
            label="الباخرة"
            options={vesselOptions}
            value={formData.vesselId || ''}
            onChange={e => setFormData({ ...formData, vesselId: e.target.value })}
            required
          />
          <Input
            label="نوع البضاعة"
            value={formData.cargoType || ''}
            onChange={e => setFormData({ ...formData, cargoType: e.target.value })}
            required
          />
          <Input
            label="الوزن القائم"
            type="number"
            value={formData.grossWeight ?? 0}
            onChange={e => setFormData({ ...formData, grossWeight: Number(e.target.value) })}
          />
          <Input
            label="الوزن الصافي"
            type="number"
            value={formData.netWeight ?? 0}
            onChange={e => setFormData({ ...formData, netWeight: Number(e.target.value) })}
          />
          <Input
            label="العدد"
            type="number"
            value={formData.quantity ?? 0}
            onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
          />
          <Select
            label="الواحدة"
            options={UNITS}
            value={formData.unit || 'roll'}
            onChange={e => setFormData({ ...formData, unit: e.target.value as any })}
            required
          />
          
          <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : (editingBL ? 'حفظ التعديلات' : 'إضافة البوليصة')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
