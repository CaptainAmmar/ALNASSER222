import React, { useState, useEffect } from 'react';
import { DataGrid } from '../components/DataGrid';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { Input, Select, Button, SearchableSelect } from '../components/Form';
import { useFirestore } from '../hooks/useFirestore';
import { Operation, Vessel, BillOfLading, Truck } from '../types';
import { OPERATION_TYPES } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, query, where, getDocs, doc as firestoreDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';

export const Operations: React.FC = () => {
  const { profile } = useAuth();
  const { data: operations, add, update, remove } = useFirestore<Operation>('operations');
  const { data: vessels, update: updateVessel } = useFirestore<Vessel>('vessels');
  const { data: bls } = useFirestore<BillOfLading>('billsOfLading');
  const { data: trucks } = useFirestore<Truck>('trucks');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingOp, setEditingOp] = useState<Operation | null>(null);
  const [deletingOp, setDeletingOp] = useState<Operation | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Operation>>({
    type: undefined,
    vesselId: '',
    blId: '',
    truckId: '',
    netWeight: undefined,
    quantity: undefined,
    operationDate: new Date().toISOString().split('T')[0],
  });

  const [newTruckPlate, setNewTruckPlate] = useState('');

  const columns = [
    { 
      key: 'type', 
      label: 'نوع العملية',
      render: (val: string) => val === 'loading' ? 'تحميل' : 'تفريغ'
    },
    { 
      key: 'vesselId', 
      label: 'الباخرة',
      render: (val: string) => {
        const vessel = vessels.find(v => v.id === val);
        return vessel ? `${vessel.name} (${vessel.arrivalDate})` : val;
      }
    },
    { 
      key: 'blId', 
      label: 'رقم البوليصة',
      render: (val: string) => bls.find(b => b.id === val)?.number || val
    },
    { 
      key: 'truckId', 
      label: 'رقم السيارة',
      render: (val: string) => trucks.find(t => t.id === val)?.plateNumber || val
    },
    { key: 'netWeight', label: 'الوزن الصافي' },
    { key: 'quantity', label: 'العدد' },
    { key: 'operationDate', label: 'تاريخ العملية' },
    { key: 'employeeName', label: 'الموظف المسؤول' },
  ];

  const handleAdd = () => {
    setEditingOp(null);
    setFormData({
      type: undefined,
      vesselId: '',
      blId: '',
      truckId: '',
      netWeight: undefined,
      quantity: undefined,
      operationDate: new Date().toISOString().split('T')[0],
    });
    setNewTruckPlate('');
    setIsModalOpen(true);
  };

  const handleEdit = (op: Operation) => {
    setEditingOp(op);
    setFormData(op);
    setIsModalOpen(true);
  };

  const handleDelete = (op: Operation) => {
    setDeletingOp(op);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingOp) return;
    
    setIsSubmitting(true);
    try {
      // Save to recycle bin first - use the same ID for consistency
      await setDoc(firestoreDoc(db, 'deletedOperations', deletingOp.id), {
        ...deletingOp,
        deletedBy: profile?.name || 'Unknown',
        deletedAt: new Date().toISOString()
      });

      // Notify manager about deletion
      if (profile?.role !== 'manager') {
        await addDoc(collection(db, 'notifications'), {
          userId: 'manager_broadcast',
          title: 'حذف عملية تشغيل',
          content: `قام الموظف ${profile?.name} بحذف عملية تشغيل للباخرة ${vessels.find(v => v.id === deletingOp.vesselId)?.name}`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'deletion'
        });
      }

      await remove(deletingOp.id);
      setIsConfirmOpen(false);
      setDeletingOp(null);
      toast.success('تم حذف العملية ونقلها إلى سجل المحذوفات');
    } catch (err) {
      console.error("Error deleting operation:", err);
      toast.error('حدث خطأ أثناء الحذف. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.type || !formData.vesselId || !formData.blId || (!formData.truckId && !newTruckPlate)) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    // Validation against Bill of Lading
    const selectedBL = bls.find(b => b.id === formData.blId);
    if (selectedBL) {
      if ((formData.netWeight || 0) > selectedBL.netWeight) {
        toast.error('الوزن المدخل أكبر من وزن البوليصة');
        return;
      }
      if ((formData.quantity || 0) > selectedBL.quantity) {
        toast.error('العدد المدخل أكبر من عدد البوليصة');
        return;
      }
    }
    
    setIsSubmitting(true);
    try {
      let finalTruckId = formData.truckId;

      // Auto-add truck if it's a new plate number
      if (newTruckPlate && !formData.truckId) {
        const existingTruck = trucks.find(t => t.plateNumber === newTruckPlate);
        if (existingTruck) {
          finalTruckId = existingTruck.id;
        } else {
          const truckRef = await addDoc(collection(db, 'trucks'), {
            plateNumber: newTruckPlate,
            driverName: '',
            driverPhone: ''
          });
          finalTruckId = truckRef.id;
        }
      }

      const opData = {
        ...formData,
        truckId: finalTruckId,
        employeeId: profile?.id || profile?.uid || '',
        employeeName: profile?.name || '',
        timestamp: editingOp ? editingOp.timestamp : new Date().toISOString(),
        operationDate: formData.operationDate || new Date().toISOString().split('T')[0]
      };

      if (editingOp) {
        await update(editingOp.id, opData);
        toast.success('تم تحديث العملية بنجاح');
      } else {
        await add(opData as Omit<Operation, 'id'>);
        
        // Update vessel status to operating
        if (formData.vesselId) {
          const vessel = vessels.find(v => v.id === formData.vesselId);
          if (vessel && vessel.status !== 'operating') {
            await updateVessel(vessel.id, { status: 'operating' });
          }
        }
        
        toast.success('تم إضافة العملية بنجاح');
      }
      setIsModalOpen(false);
      setEditingOp(null);
      setFormData({
        type: undefined,
        vesselId: '',
        blId: '',
        truckId: '',
        netWeight: undefined,
        quantity: undefined,
        operationDate: new Date().toISOString().split('T')[0],
      });
      setNewTruckPlate('');
    } catch (err) {
      console.error("Error saving operation:", err);
      toast.error('حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const vesselOptions = vessels.map(v => ({ 
    value: v.id, 
    label: `${v.name} (${v.arrivalDate})` 
  }));
  const blOptions = bls
    .filter(b => b.vesselId === formData.vesselId)
    .map(b => ({ value: b.id, label: b.number }));
  const truckOptions = trucks.map(t => ({ value: t.id, label: t.plateNumber }));

  return (
    <div className="space-y-6">
      <DataGrid
        title="إدارة عمليات التشغيل"
        columns={columns}
        data={operations}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="تأكيد حذف العملية"
        message="هل أنت متأكد من حذف هذه العملية؟ سيتم نقلها إلى سجل المحذوفات."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingOp ? 'تعديل عملية' : 'إضافة عملية جديدة'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="نوع العملية"
            options={OPERATION_TYPES}
            value={formData.type ?? ''}
            onChange={e => setFormData({ ...formData, type: e.target.value as any })}
            required
          />
          <Select
            label="الباخرة"
            options={vesselOptions}
            value={formData.vesselId ?? ''}
            onChange={e => setFormData({ ...formData, vesselId: e.target.value })}
            required
          />
          <Select
            label="رقم البوليصة"
            options={blOptions}
            value={formData.blId ?? ''}
            onChange={e => setFormData({ ...formData, blId: e.target.value })}
            required
            disabled={!formData.vesselId}
          />
          
          <div className="flex gap-2 items-end">
            <SearchableSelect
              label="رقم السيارة"
              options={truckOptions}
              value={formData.truckId ?? ''}
              onChange={val => {
                setFormData({ ...formData, truckId: val });
                if (val) setNewTruckPlate('');
              }}
              placeholder="اختر سيارة..."
              className="flex-1"
            />
            {!formData.truckId && (
              <div className="w-32">
                <Input
                  label="رقم جديد"
                  placeholder="رقم جديد..."
                  value={newTruckPlate}
                  onChange={e => setNewTruckPlate(e.target.value)}
                />
              </div>
            )}
          </div>

          <Input
            label="الوزن الصافي"
            type="number"
            value={formData.netWeight ?? ''}
            onChange={e => setFormData({ ...formData, netWeight: e.target.value === '' ? undefined : Number(e.target.value) })}
            required
          />
          <Input
            label="العدد"
            type="number"
            value={formData.quantity ?? ''}
            onChange={e => setFormData({ ...formData, quantity: e.target.value === '' ? undefined : Number(e.target.value) })}
            required
          />
          <Input
            label="تاريخ التفريغ/التحميل"
            type="date"
            value={formData.operationDate || ''}
            onChange={e => setFormData({ ...formData, operationDate: e.target.value })}
            required
          />
          
          <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : (editingOp ? 'حفظ التعديلات' : 'إضافة العملية')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
