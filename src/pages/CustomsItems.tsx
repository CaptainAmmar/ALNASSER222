import React, { useState } from 'react';
import { DataGrid } from '../components/DataGrid';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { Input, Button, Textarea } from '../components/Form';
import { useFirestore } from '../hooks/useFirestore';
import { CustomsItem } from '../types';
import { FileText, Upload, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '../components/Sidebar';
import { motion, AnimatePresence } from 'motion/react';
import * as pdfjs from 'pdfjs-dist';
import { GoogleGenAI, Type } from "@google/genai";
import { toast } from 'sonner';

// Set worker source for pdfjs using Vite's worker loader
// @ts-ignore - TypeScript doesn't know about the ?url suffix
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export const CustomsItems: React.FC = () => {
  const { data: items, add, addBatch, update, remove } = useFirestore<CustomsItem>('customsItems');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const shouldStopImportRef = React.useRef(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, status: '' });
  const [editingItem, setEditingItem] = useState<CustomsItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<CustomsItem | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [formData, setFormData] = useState<Partial<CustomsItem>>({
    code: '',
    description: '',
    unit: '',
    customsDuty: 0,
    serviceFee: 0,
    exportDuty: 0,
    notes: '',
  });

  const columns = [
    { key: 'code', label: 'البند الجمركي' },
    { key: 'description', label: 'الوصف' },
    { key: 'unit', label: 'الوحدة' },
    { key: 'customsDuty', label: 'الرسم الجمركي' },
    { key: 'serviceFee', label: 'بدل خدمات' },
    { key: 'exportDuty', label: 'رسم التصدير' },
    { key: 'notes', label: 'ملاحظات' },
  ];

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      code: '',
      description: '',
      unit: '',
      customsDuty: 0,
      serviceFee: 0,
      exportDuty: 0,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: CustomsItem) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  const handleDelete = (item: CustomsItem) => {
    setDeletingItem(item);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    try {
      await remove(deletingItem.id);
      setIsConfirmOpen(false);
    } catch (err) {
      console.error("Error deleting customs item:", err);
      toast.error('حدث خطأ أثناء الحذف. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleClearAll = () => {
    if (items.length === 0) return;
    setIsClearAllConfirmOpen(true);
  };

  const confirmClearAll = async () => {
    setIsClearing(true);
    try {
      // Delete all items one by one
      // In a real production app, a batch delete or cloud function would be better
      for (const item of items) {
        await remove(item.id);
      }
      setIsClearAllConfirmOpen(false);
    } catch (err) {
      console.error("Error clearing customs items:", err);
      toast.error('حدث خطأ أثناء مسح البيانات. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsClearing(false);
    }
  };

  const existingCodes = React.useMemo(() => new Set(items.map(i => i.code)), [items]);

  const handleImportPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    shouldStopImportRef.current = false;
    setImportProgress({ current: 0, total: 0, status: 'جاري تحميل الملف...' });
    
    let pdf: any = null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
      pdf = await loadingTask.promise;
      const pageCount = pdf.numPages;
      
      setImportProgress({ current: 0, total: pageCount, status: 'جاري استخراج النصوص...' });
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let totalAdded = 0;
      let totalSkipped = 0;
      let totalErrors = 0;
      
      const addedInSession = new Set<string>();
      const itemsToBatch: Omit<CustomsItem, 'id'>[] = [];

      for (let i = 1; i <= pageCount; i++) {
        if (shouldStopImportRef.current) break;
        
        setImportProgress(prev => ({ ...prev, current: i, status: `جاري تحليل الصفحة ${i}...` }));
        
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Simplified text extraction to reduce main thread load
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

          // Clear textContent from memory as soon as possible
          (textContent as any) = null;

          if (!pageText) {
            page.cleanup();
            continue;
          }

          const prompt = `
            Extract customs items from the following text. 
            Columns: Customs Code (البند الجمركي), Description (الوصف), Unit (الوحدة), Customs Duty (الرسم الجمركي), Service Fee (بدل خدمات), Export Duty (رسم التصدير), and Notes (ملاحظات).
            Only return the JSON array, no other text.
            
            Text:
            ${pageText}
          `;

          const aiResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ parts: [{ text: prompt }] }],
            config: { 
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    code: { type: Type.STRING },
                    description: { type: Type.STRING },
                    unit: { type: Type.STRING },
                    customsDuty: { type: Type.NUMBER },
                    serviceFee: { type: Type.NUMBER },
                    exportDuty: { type: Type.NUMBER },
                    notes: { type: Type.STRING },
                  },
                  required: ["code", "description"]
                }
              }
            }
          });

          const text = aiResponse.text;
          if (text) {
            const pageItems: any[] = JSON.parse(text);
            if (Array.isArray(pageItems)) {
              for (const item of pageItems) {
                const sanitizedItem = {
                  code: String(item.code || '').trim(),
                  description: String(item.description || '').trim(),
                  unit: String(item.unit || '').trim(),
                  customsDuty: Number(item.customsDuty) || 0,
                  serviceFee: Number(item.serviceFee) || 0,
                  exportDuty: Number(item.exportDuty) || 0,
                  notes: String(item.notes || '').trim(),
                };

                if (!sanitizedItem.code || !sanitizedItem.description) continue;
                if (existingCodes.has(sanitizedItem.code) || addedInSession.has(sanitizedItem.code)) {
                  totalSkipped++;
                  continue;
                }

                itemsToBatch.push(sanitizedItem);
                addedInSession.add(sanitizedItem.code);
                
                // Commit in chunks of 500 to Firestore
                if (itemsToBatch.length >= 500) {
                  setImportProgress(prev => ({ ...prev, status: `جاري حفظ الدفعة (${totalAdded + itemsToBatch.length})...` }));
                  await addBatch(itemsToBatch);
                  totalAdded += itemsToBatch.length;
                  itemsToBatch.length = 0;
                }
              }
            }
          }
          
          page.cleanup();
          
          // Chunking: longer pause every 5 pages to let browser GC
          if (i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (pageErr) {
          console.error(`Error processing Page ${i}:`, pageErr);
          totalErrors++;
        }
      }

      // Final batch commit
      if (itemsToBatch.length > 0) {
        setImportProgress(prev => ({ ...prev, status: `جاري حفظ الدفعة النهائية...` }));
        await addBatch(itemsToBatch);
        totalAdded += itemsToBatch.length;
      }

      if (shouldStopImportRef.current) {
        toast.info('تم إيقاف عملية الاستيراد بطلب من المستخدم.');
      } else if (totalAdded > 0 || totalSkipped > 0) {
        toast.success(`تم استيراد ${totalAdded} بند بنجاح. تم تخطي ${totalSkipped} بند مكرر.`, { duration: 5000 });
      } else {
        toast.error('لم يتم العثور على بيانات جديدة في الملف.');
      }
    } catch (err) {
      console.error("Error importing PDF:", err);
      toast.error('حدث خطأ أثناء استيراد الملف.');
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0, status: '' });
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await update(editingItem.id, formData);
      } else {
        await add(formData as Omit<CustomsItem, 'id'>);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving customs item:", err);
      toast.error('حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-3">
        <Button 
          variant="secondary" 
          className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
          onClick={handleClearAll}
          disabled={items.length === 0 || isClearing}
        >
          {isClearing ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
          <span>مسح كافة السجلات</span>
        </Button>
          <label className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm font-bold text-sm cursor-pointer">
            <Upload size={18} />
            <span>استيراد من PDF</span>
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleImportPDF} 
              className="hidden" 
              disabled={isImporting}
            />
          </label>
      </div>

      {/* Full Screen Loading Overlay for Import */}
      <AnimatePresence>
        {isImporting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6"
          >
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center space-y-6 border border-white/20">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
                <div 
                  className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin" 
                  style={{ animationDuration: '1s' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="text-blue-600" size={32} />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">جاري استيراد البيانات</h3>
                <p className="text-slate-500 font-bold">{importProgress.status}</p>
              </div>

              <div className="space-y-3">
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-blue-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-black text-slate-400">
                  <span>صفحة {importProgress.current}</span>
                  <span>من أصل {importProgress.total}</span>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  variant="secondary" 
                  className="w-full bg-red-50 text-red-600 hover:bg-red-100 border-red-100"
                  onClick={() => { shouldStopImportRef.current = true; }}
                >
                  <AlertCircle size={18} />
                  <span>إيقاف العملية</span>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DataGrid
        title="إدارة البنود الجمركية"
        columns={columns}
        data={items}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="تأكيد حذف البند الجمركي"
        message="هل أنت متأكد من حذف هذا البند الجمركي؟ سيتم حذف كافة البيانات المرتبطة به."
      />

      <ConfirmModal
        isOpen={isClearAllConfirmOpen}
        onClose={() => setIsClearAllConfirmOpen(false)}
        onConfirm={confirmClearAll}
        title="تأكيد مسح كافة البيانات"
        message="هل أنت متأكد من مسح كافة البنود الجمركية؟ لا يمكن التراجع عن هذا الإجراء."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'تعديل بند جمركي' : 'إضافة بند جمركي جديد'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="البند الجمركي"
            value={formData.code || ''}
            onChange={e => setFormData({ ...formData, code: e.target.value })}
            required
          />
          <Input
            label="الوصف"
            value={formData.description || ''}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            required
          />
          <Input
            label="الوحدة"
            value={formData.unit || ''}
            onChange={e => setFormData({ ...formData, unit: e.target.value })}
            required
          />
          <Input
            label="الرسم الجمركي"
            type="number"
            value={formData.customsDuty ?? 0}
            onChange={e => setFormData({ ...formData, customsDuty: Number(e.target.value) })}
            required
          />
          <Input
            label="بدل خدمات"
            type="number"
            value={formData.serviceFee ?? 0}
            onChange={e => setFormData({ ...formData, serviceFee: Number(e.target.value) })}
            required
          />
          <Input
            label="رسم التصدير"
            type="number"
            value={formData.exportDuty ?? 0}
            onChange={e => setFormData({ ...formData, exportDuty: Number(e.target.value) })}
            required
          />
          <div className="md:col-span-2">
            <Textarea
              label="ملاحظات"
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
          
          <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : (editingItem ? 'حفظ التعديلات' : 'إضافة البند')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
