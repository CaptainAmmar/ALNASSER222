import React, { useState, useRef } from 'react';
import { DataGrid } from '../components/DataGrid';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { Input, Button } from '../components/Form';
import { useFirestore } from '../hooks/useFirestore';
import { Truck } from '../types';
import { toast } from 'sonner';
import { Upload, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

export const Trucks: React.FC = () => {
  const { data: trucks, add, update, remove, addBatch } = useFirestore<Truck>('trucks');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [deletingTruck, setDeletingTruck] = useState<Truck | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Truck>>({
    plateNumber: '',
    driverName: '',
    driverPhone: '',
  });

  const columns = [
    { key: 'plateNumber', label: 'رقم السيارة' },
    { key: 'driverName', label: 'اسم السائق' },
    { key: 'driverPhone', label: 'رقم الموبايل' },
  ];

  const handleAdd = () => {
    setEditingTruck(null);
    setFormData({
      plateNumber: '',
      driverName: '',
      driverPhone: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (truck: Truck) => {
    setEditingTruck(truck);
    setFormData(truck);
    setIsModalOpen(true);
  };

  const handleDelete = (truck: Truck) => {
    setDeletingTruck(truck);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingTruck) return;
    setIsSubmitting(true);
    try {
      await remove(deletingTruck.id);
      setIsConfirmOpen(false);
      setDeletingTruck(null);
      toast.success('تم حذف السيارة بنجاح');
    } catch (err) {
      console.error("Error deleting truck:", err);
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
      if (editingTruck) {
        await update(editingTruck.id, formData);
        toast.success('تم تحديث بيانات السيارة بنجاح');
      } else {
        await add(formData as Omit<Truck, 'id'>);
        toast.success('تم إضافة السيارة بنجاح');
      }
      setIsModalOpen(false);
      setEditingTruck(null);
    } catch (err) {
      console.error("Error saving truck:", err);
      toast.error('حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const toastId = toast.loading('جاري معالجة الملف...');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (data.length === 0) {
          toast.error('الملف فارغ', { id: toastId });
          setIsImporting(false);
          return;
        }

        toast.loading(`جاري استيراد ${data.length} سجل...`, { id: toastId });

        const newTrucks: Omit<Truck, 'id'>[] = [];
        let skippedCount = 0;

        // Create a map for faster lookup
        const existingPlateNumbers = new Set(trucks.map(t => t.plateNumber));

        for (const row of data) {
          const plateNumber = String(row['رقم السيارة'] || row['plateNumber'] || '').trim();
          const driverName = String(row['اسم السائق'] || row['driverName'] || '').trim();
          const driverPhone = String(row['رقم الموبايل'] || row['driverPhone'] || '').trim();

          if (!plateNumber) continue;

          if (!existingPlateNumbers.has(plateNumber)) {
            newTrucks.push({ plateNumber, driverName, driverPhone });
          } else {
            skippedCount++;
          }
        }

        if (newTrucks.length > 0) {
          await addBatch(newTrucks);
        }

        toast.success(`تم استيراد ${newTrucks.length} سيارة بنجاح. تم تخطي ${skippedCount} سيارة موجودة مسبقاً.`, { id: toastId });
      } catch (err) {
        console.error("Error importing excel:", err);
        toast.error('حدث خطأ أثناء استيراد الملف. تأكد من صيغة الملف.', { id: toastId });
      } finally {
        setIsImporting(false);
      }
    };
    reader.onerror = () => {
      toast.error('خطأ في قراءة الملف', { id: toastId });
      setIsImporting(false);
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImport}
          accept=".xlsx, .xls"
          className="hidden"
        />
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2"
          disabled={isImporting}
        >
          {isImporting ? (
            <RefreshCw size={18} className="animate-spin" />
          ) : (
            <Upload size={18} />
          )}
          <span>{isImporting ? 'جاري الاستيراد...' : 'استيراد من Excel'}</span>
        </Button>
      </div>

      <DataGrid
        title="إدارة السيارات"
        columns={columns}
        data={trucks}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="تأكيد حذف السيارة"
        message="هل أنت متأكد من حذف هذه السيارة؟ سيتم حذف كافة البيانات المرتبطة بها."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTruck ? 'تعديل سيارة' : 'إضافة سيارة جديدة'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
          <Input
            label="رقم السيارة"
            value={formData.plateNumber || ''}
            onChange={e => setFormData({ ...formData, plateNumber: e.target.value })}
            required
          />
          <Input
            label="اسم السائق"
            value={formData.driverName || ''}
            onChange={e => setFormData({ ...formData, driverName: e.target.value })}
          />
          <Input
            label="رقم الموبايل"
            value={formData.driverPhone || ''}
            onChange={e => setFormData({ ...formData, driverPhone: e.target.value })}
          />
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : (editingTruck ? 'حفظ التعديلات' : 'إضافة السيارة')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
