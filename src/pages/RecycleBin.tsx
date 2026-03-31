import React from 'react';
import { DataGrid } from '../components/DataGrid';
import { Button } from '../components/Form';
import { ConfirmModal } from '../components/ConfirmModal';
import { useFirestore } from '../hooks/useFirestore';
import { DeletedOperation, Vessel, BillOfLading, Truck } from '../types';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export const RecycleBin: React.FC = () => {
  const { data: deletedOps, remove: removeFromDeleted } = useFirestore<DeletedOperation>('deletedOperations');
  const { set: restoreToOps } = useFirestore<any>('operations');
  const { data: vessels } = useFirestore<Vessel>('vessels');
  const { data: bls } = useFirestore<BillOfLading>('billsOfLading');
  const { data: trucks } = useFirestore<Truck>('trucks');

  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [confirmType, setConfirmType] = React.useState<'restore' | 'delete'>('restore');
  const [selectedOp, setSelectedOp] = React.useState<DeletedOperation | null>(null);

  const handleRestore = (op: DeletedOperation) => {
    setSelectedOp(op);
    setConfirmType('restore');
    setIsConfirmOpen(true);
  };

  const handleDelete = (op: DeletedOperation) => {
    setSelectedOp(op);
    setConfirmType('delete');
    setIsConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedOp || isSubmitting) return;

    setIsSubmitting(true);
    console.log(`Attempting ${confirmType} for operation ID: ${selectedOp.id}`);
    
    try {
      if (confirmType === 'restore') {
        const { id, deletedBy, deletedAt, ...originalOp } = selectedOp;
        // Restore to operations with original ID
        await restoreToOps(id, { ...originalOp, id });
        // Remove from deletedOperations
        await removeFromDeleted(id);
        toast.success('تم استعادة العملية بنجاح');
      } else {
        // Permanent delete from deletedOperations
        await removeFromDeleted(selectedOp.id);
        toast.success('تم حذف العملية نهائياً');
      }
      setIsConfirmOpen(false);
      setSelectedOp(null);
    } catch (err: any) {
      console.error(`Error ${confirmType}ing operation:`, err);
      if (err.code === 'permission-denied') {
        toast.error('ليس لديك صلاحية للقيام بهذا الإجراء. يرجى التأكد من أنك مسجل كمدير.');
      } else {
        toast.error(`حدث خطأ أثناء ${confirmType === 'restore' ? 'الاستعادة' : 'الحذف'}: ${err.message || ''}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { 
      key: 'type', 
      label: 'نوع العملية',
      render: (val: string) => val === 'loading' ? 'تحميل' : 'تفريغ'
    },
    { 
      key: 'vesselId', 
      label: 'الباخرة',
      render: (val: string) => vessels.find(v => v.id === val)?.name || val
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
    { key: 'deletedBy', label: 'حذفت بواسطة' },
    { key: 'deletedAt', label: 'تاريخ الحذف' },
  ];

  return (
    <div className="space-y-6">
      <DataGrid
        title="سجل المحذوفات"
        columns={columns}
        data={deletedOps}
        canAdd={false}
        canEdit={false}
        canDelete={true}
        onRowClick={(item) => {}}
        onDelete={(item) => handleDelete(item as DeletedOperation)}
        onRestore={(item) => handleRestore(item as DeletedOperation)}
      />
      
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => !isSubmitting && setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
        isLoading={isSubmitting}
        title={confirmType === 'restore' ? 'تأكيد استعادة العملية' : 'تأكيد الحذف النهائي'}
        message={confirmType === 'restore' ? 'هل أنت متأكد من استعادة هذه العملية؟' : 'هل أنت متأكد من حذف هذه العملية نهائياً؟ لا يمكن التراجع عن هذا الإجراء.'}
        type={confirmType === 'restore' ? 'info' : 'danger'}
        confirmText={confirmType === 'restore' ? 'استعادة' : 'حذف نهائي'}
      />
      <div className="p-4 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium flex items-center gap-2">
        <RotateCcw size={18} />
        <span>انقر على زر الاستعادة (أيقونة السهم المنحني) لاستعادة السجل المحذوف.</span>
      </div>
    </div>
  );
};
