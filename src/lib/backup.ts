import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { toast } from 'sonner';

const COLLECTIONS = [
  'users',
  'vessels',
  'billsOfLading',
  'customsDeclarations',
  'operations',
  'trucks',
  'customsItems',
  'notifications',
  'messages',
  'settings',
  'deletedOperations'
];

export const exportToExcel = async () => {
  const workbook = XLSX.utils.book_new();

  for (const colName of COLLECTIONS) {
    try {
      console.log(`[Backup] Exporting collection: ${colName}...`);
      const querySnapshot = await getDocs(collection(db, colName));
      const data = querySnapshot.docs.map(doc => ({
        _id: doc.id,
        ...doc.data()
      }));

      if (data.length > 0) {
        // Convert complex objects to strings and enforce Excel limits
        const processedData = data.map(item => {
          const newItem: any = {};
          for (const [key, value] of Object.entries(item)) {
            let val: any = value;
            
            // 1. Handle Firestore Timestamps
            if (value && typeof value === 'object' && (value as any).seconds !== undefined) {
              val = new Date((value as any).seconds * 1000).toISOString();
            } 
            // 2. Handle Objects/Arrays
            else if (value && typeof value === 'object' && !((value as any) instanceof Date)) {
              try {
                // Check if it's a Firestore DocumentReference
                if ((value as any).path && (value as any).id && (value as any).firestore) {
                  val = `[Ref: ${(value as any).path}]`;
                } else {
                  // Use a safe stringify that handles circular references
                  const cache = new Set();
                  val = JSON.stringify(value, (key, val) => {
                    if (typeof val === 'object' && val !== null) {
                      if (cache.has(val)) return '[Circular]';
                      cache.add(val);
                    }
                    return val;
                  });
                }
              } catch (e) {
                console.warn(`[Backup] Failed to stringify field "${key}" in "${colName}":`, e);
                val = String(value);
              }
            }

            // 3. Enforce Excel cell limit (32,767 characters)
            // We use a slightly smaller limit to be safe
            if (typeof val === 'string' && val.length > 32000) {
              console.warn(`[Backup] Truncating field "${key}" in collection "${colName}" (Original length: ${val.length})`);
              val = val.substring(0, 32000) + "... [TRUNCATED]";
            }
            
            newItem[key] = val;
          }
          return newItem;
        });

        const worksheet = XLSX.utils.json_to_sheet(processedData);
        
        // Set RTL for the worksheet
        if (!worksheet['!views']) worksheet['!views'] = [];
        worksheet['!views'][0] = { RTL: true };
        
        XLSX.utils.book_append_sheet(workbook, worksheet, colName);
        console.log(`[Backup] Collection "${colName}" exported successfully (${data.length} records).`);
      }
    } catch (error: any) {
      console.error(`[Backup] Error exporting collection "${colName}":`, error);
      // We don't throw here to allow other collections to be exported
      toast.error(`خطأ في تصدير ${colName}: ${error.message || 'خطأ غير معروف'}`);
    }
  }

  try {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const fileName = `Alnasser_${timestamp}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    console.log(`[Backup] Backup file "${fileName}" created successfully.`);
  } catch (error: any) {
    console.error("[Backup] Final Excel write error:", error);
    throw error;
  }
};

export const importFromExcel = async (file: File) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        for (const sheetName of workbook.SheetNames) {
          if (!COLLECTIONS.includes(sheetName)) continue;

          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Use batches for efficiency (Firestore limit is 500 per batch)
          let batch = writeBatch(db);
          let count = 0;

          for (const item of jsonData as any[]) {
            const { _id, ...rest } = item;
            if (!_id) continue;

            const processedItem: any = {};
            for (const [key, value] of Object.entries(rest)) {
              if (typeof value === 'string') {
                // Try to parse JSON or Dates
                try {
                  if (value.startsWith('{') || value.startsWith('[')) {
                    processedItem[key] = JSON.parse(value);
                  } else if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                    processedItem[key] = new Date(value);
                  } else {
                    processedItem[key] = value;
                  }
                } catch {
                  processedItem[key] = value;
                }
              } else {
                processedItem[key] = value;
              }
            }

            const docRef = doc(db, sheetName, _id);
            batch.set(docRef, processedItem, { merge: true });
            count++;

            if (count >= 400) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }

          if (count > 0) {
            await batch.commit();
          }
        }
        resolve(true);
      } catch (error) {
        console.error('Error importing from Excel:', error);
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
