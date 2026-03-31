import React, { useState, useEffect } from 'react';
import { 
  collection, query, onSnapshot, addDoc, 
  updateDoc, deleteDoc, doc, QueryConstraint, setDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export function useFirestore<T>(collectionName: string, ...queryConstraints: QueryConstraint[]) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use a stable key for query constraints to avoid infinite re-renders
  const constraintsKey = React.useMemo(() => {
    if (queryConstraints.length === 0) return 'none';
    try {
      return JSON.stringify(queryConstraints.map(c => {
        // This is a bit hacky but helps identify if constraints changed
        // Firestore constraints don't have a simple way to get their values
        return typeof c === 'object' ? Object.keys(c).join(',') : String(c);
      }));
    } catch (e) {
      return 'complex-' + queryConstraints.length;
    }
  }, [queryConstraints.length]); // Only re-calculate if length changes, or we can use a more complex check

  useEffect(() => {
    const q = query(collection(db, collectionName), ...queryConstraints);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: T[] = snapshot.docs.map(doc => ({
        ...doc.data() as any,
        id: doc.id
      }));
      setData(items);
      setLoading(false);
    }, (err: any) => {
      console.error(`Error fetching ${collectionName}:`, err);
      if (err.code === 'permission-denied') {
        try {
          handleFirestoreError(err, OperationType.LIST, collectionName);
        } catch (e: any) {
          setError(e.message);
        }
      } else {
        setError(err.message);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, constraintsKey]);

  const add = async (item: Omit<T, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, collectionName), item);
      return docRef.id;
    } catch (err: any) {
      console.error(`Error adding to ${collectionName}:`, err);
      if (err.code === 'resource-exhausted') {
        setError('تم تجاوز حصة الاستخدام اليومية لقاعدة البيانات. يرجى المحاولة لاحقاً.');
      } else if (err.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.CREATE, collectionName);
      }
      throw err;
    }
  };

  const addBatch = async (items: Omit<T, 'id'>[]) => {
    if (items.length === 0) return;
    
    // Firestore limit is 500 operations per batch
    const CHUNK_SIZE = 450; // Use a slightly smaller size for safety
    const chunks = [];
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      chunks.push(items.slice(i, i + CHUNK_SIZE));
    }

    try {
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        const colRef = collection(db, collectionName);
        
        chunk.forEach(item => {
          const docRef = doc(colRef);
          batch.set(docRef, item);
        });

        await batch.commit();
      }
    } catch (err: any) {
      console.error(`Error adding batch to ${collectionName}:`, err);
      if (err.code === 'resource-exhausted') {
        setError('تم تجاوز حصة الاستخدام اليومية لقاعدة البيانات. يرجى المحاولة لاحقاً.');
      } else if (err.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.WRITE, collectionName);
      }
      throw err;
    }
  };

  const update = async (id: string, item: Partial<T>) => {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, item as any);
    } catch (err: any) {
      console.error(`Error updating ${collectionName}:`, err);
      if (err.code === 'resource-exhausted') {
        setError('تم تجاوز حصة الاستخدام اليومية لقاعدة البيانات. يرجى المحاولة لاحقاً.');
      } else if (err.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.UPDATE, `${collectionName}/${id}`);
      }
      throw err;
    }
  };

  const remove = async (id: string) => {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (err: any) {
      console.error(`Error deleting from ${collectionName}:`, err);
      if (err.code === 'resource-exhausted') {
        setError('تم تجاوز حصة الاستخدام اليومية لقاعدة البيانات. يرجى المحاولة لاحقاً.');
      } else if (err.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
      }
      throw err;
    }
  };

  const set = async (id: string, item: T) => {
    try {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, item as any);
    } catch (err: any) {
      console.error(`Error setting ${collectionName}/${id}:`, err);
      if (err.code === 'resource-exhausted') {
        setError('تم تجاوز حصة الاستخدام اليومية لقاعدة البيانات. يرجى المحاولة لاحقاً.');
      } else if (err.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${id}`);
      }
      throw err;
    }
  };

  return { data, loading, error, add, addBatch, update, remove, set };
}
