import React, { useState } from 'react';
import { DataGrid } from '../components/DataGrid';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { Input, Select, Button } from '../components/Form';
import { useFirestore } from '../hooks/useFirestore';
import { CustomsDeclaration, Vessel, BillOfLading, CustomsItem } from '../types';
import { CUSTOMS_TYPES, UNITS } from '../constants';
import { toast } from 'sonner';

export const CustomsDeclarations: React.FC = () => {
  const { data: declarations, add, update, remove } = useFirestore<CustomsDeclaration>('customsDeclarations');
  const { data: vessels } = useFirestore<Vessel>('vessels');
  const { data: bls } = useFirestore<BillOfLading>('billsOfLading');
  const { data: customsItems } = useFirestore<CustomsItem>('customsItems');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDecl, setEditingDecl] = useState<CustomsDeclaration | null>(null);
  const [deletingDecl, setDeletingDecl] = useState<CustomsDeclaration | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<CustomsDeclaration>>({
    type: 'import',
    code: '',
    number: '',
    date: '',
    consignor: '',
    consignee: '',
    declarant: '',
    clearingAgent: '',
    vesselId: '',
    blId: '',
    customsItemId: '',
    customsFees: 0,
    cargoType: '',
    grossWeight: 0,
    netWeight: 0,
    quantity: 0,
    unit: 'roll',
    totalValue: 0,
    destination: '',
  });

  const columns = [
    { key: 'type', label: 'نوع البيان', render: (val: string) => CUSTOMS_TYPES.find(t => t.value === val)?.label || val },
    { key: 'code', label: 'الرمز' },
    { key: 'number', label: 'رقم البيان' },
    { key: 'date', label: 'تاريخ البيان' },
    { key: 'consignor', label: 'اسم المرسل' },
    { key: 'consignee', label: 'المرسل إليه' },
    { key: 'destination', label: 'المقصد' },
    { key: 'vesselId', label: 'الباخرة', render: (val: string) => {
      const vessel = vessels.find(v => v.id === val);
      return vessel ? `${vessel.name} (${vessel.arrivalDate})` : val;
    } },
    { key: 'blId', label: 'البوليصة', render: (val: string) => bls.find(b => b.id === val)?.number || val },
    { key: 'cargoType', label: 'نوع البضاعة' },
    { key: 'netWeight', label: 'الوزن الصافي' },
    { key: 'quantity', label: 'العدد' },
    { key: 'unit', label: 'الوحدة' },
    { key: 'totalValue', label: 'القيمة الاجمالية' },
  ];

  const handleAdd = () => {
    setEditingDecl(null);
    setFormData({
      type: 'import',
      code: '',
      number: '',
      date: '',
      consignor: '',
      consignee: '',
      declarant: '',
      clearingAgent: '',
      vesselId: '',
      blId: '',
      customsItemId: '',
      customsFees: 0,
      cargoType: '',
      grossWeight: 0,
      netWeight: 0,
      quantity: 0,
      unit: 'roll',
      totalValue: 0,
      destination: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (decl: CustomsDeclaration) => {
    setEditingDecl(decl);
    setFormData(decl);
    setIsModalOpen(true);
  };

  const handleDelete = (decl: CustomsDeclaration) => {
    setDeletingDecl(decl);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingDecl) return;
    setIsSubmitting(true);
    try {
      await remove(deletingDecl.id);
      setIsConfirmOpen(false);
      setDeletingDecl(null);
      toast.success('تم حذف البيان الجمركي بنجاح');
    } catch (err) {
      console.error("Error deleting declaration:", err);
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
      if (editingDecl) {
        await update(editingDecl.id, formData);
      } else {
        await add(formData as Omit<CustomsDeclaration, 'id'>);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving declaration:", err);
      toast.error('حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleItemChange = (itemId: string) => {
    const item = customsItems.find(i => i.id === itemId);
    if (item) {
      setFormData({
        ...formData,
        customsItemId: itemId,
        unit: item.unit || formData.unit,
        customsFees: (item.customsDuty || 0) + (item.serviceFee || 0) + (item.exportDuty || 0),
      });
    } else {
      setFormData({ ...formData, customsItemId: itemId });
    }
  };

  const vesselOptions = vessels.map(v => ({ 
    value: v.id, 
    label: `${v.name} (${v.arrivalDate})` 
  }));
  const blOptions = bls
    .filter(b => b.vesselId === formData.vesselId)
    .map(b => ({ value: b.id, label: b.number }));
  const itemOptions = customsItems.map(i => ({ value: i.id, label: `${i.code} - ${i.description}` }));

  return (
    <div className="space-y-6">
      <DataGrid
        title="إدارة البيانات الجمركية"
        columns={columns}
        data={declarations}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="تأكيد حذف البيان الجمركي"
        message="هل أنت متأكد من حذف هذا البيان الجمركي؟ سيتم حذف كافة البيانات المرتبطة به."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDecl ? 'تعديل بيان جمركي' : 'إضافة بيان جمركي جديد'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Select
            label="نوع البيان"
            options={CUSTOMS_TYPES}
            value={formData.type || 'import'}
            onChange={e => setFormData({ ...formData, type: e.target.value as any })}
            required
          />
          <Input
            label="الرمز"
            value={formData.code || ''}
            onChange={e => setFormData({ ...formData, code: e.target.value })}
          />
          <Input
            label="رقم البيان"
            value={formData.number || ''}
            onChange={e => setFormData({ ...formData, number: e.target.value })}
            required
          />
          <Input
            label="تاريخ البيان"
            type="date"
            value={formData.date || ''}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
            required
          />
          <Input
            label="اسم المرسل"
            value={formData.consignor || ''}
            onChange={e => setFormData({ ...formData, consignor: e.target.value })}
          />
          <Input
            label="المرسل إليه"
            value={formData.consignee || ''}
            onChange={e => setFormData({ ...formData, consignee: e.target.value })}
          />
          <Input
            label="المقصد"
            value={formData.destination || ''}
            onChange={e => setFormData({ ...formData, destination: e.target.value })}
          />
          <Input
            label="المصرح"
            value={formData.declarant || ''}
            onChange={e => setFormData({ ...formData, declarant: e.target.value })}
          />
          <Input
            label="المخلص"
            value={formData.clearingAgent || ''}
            onChange={e => setFormData({ ...formData, clearingAgent: e.target.value })}
          />
          <Select
            label="الباخرة"
            options={vesselOptions}
            value={formData.vesselId || ''}
            onChange={e => setFormData({ ...formData, vesselId: e.target.value })}
            required
          />
          <Select
            label="البوليصة"
            options={blOptions}
            value={formData.blId || ''}
            onChange={e => setFormData({ ...formData, blId: e.target.value })}
            required
            disabled={!formData.vesselId}
          />
          <Select
            label="البند الجمركي"
            options={itemOptions}
            value={formData.customsItemId || ''}
            onChange={e => handleItemChange(e.target.value)}
          />
          <Input
            label="الرسوم الجمركية"
            type="number"
            value={formData.customsFees ?? 0}
            onChange={e => setFormData({ ...formData, customsFees: Number(e.target.value) })}
          />
          <Input
            label="نوع البضاعة"
            value={formData.cargoType || ''}
            onChange={e => setFormData({ ...formData, cargoType: e.target.value })}
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
            onChange={e => setFormData({ ...formData, unit: e.target.value })}
          />
          <Input
            label="القيمة الاجمالية"
            type="number"
            value={formData.totalValue ?? 0}
            onChange={e => setFormData({ ...formData, totalValue: Number(e.target.value) })}
          />
          
          <div className="md:col-span-3 flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : (editingDecl ? 'حفظ التعديلات' : 'إضافة البيان')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
