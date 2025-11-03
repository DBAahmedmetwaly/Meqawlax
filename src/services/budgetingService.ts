

'use client';

import { db } from '@/lib/firebase';
import { ref, push, onValue, set, remove, get, update } from 'firebase/database';
import { addAuditLog } from './auditLogService';

export interface BudgetItem {
  id: string;
  name: string;
}

const dataToBudgetItemArray = (data: any): BudgetItem[] => {
    if (!data) return [];
    return Object.keys(data).map(key => ({
        id: key,
        ...data[key]
    }));
};

export const addBudgetItem = async (item: Omit<BudgetItem, 'id'>) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const itemsRef = ref(db, 'budgetItems');
    const newItemRef = push(itemsRef);
    await set(newItemRef, item);
    const newId = newItemRef.key;
    if (newId) {
        await addAuditLog('create', 'budgetItem', newId, `Created budget item: ${item.name}`);
    }
    return newId;
};

export const updateBudgetItem = async (id: string, data: Partial<Omit<BudgetItem, 'id'>>) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const itemRef = ref(db, `budgetItems/${id}`);
    await update(itemRef, data);
    await addAuditLog('update', 'budgetItem', id, `Updated budget item: ${data.name || 'No name change'}`);
};

export const deleteBudgetItem = async (id: string) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const itemRef = ref(db, `budgetItems/${id}`);
    const snapshot = await get(itemRef);
    const itemName = snapshot.val()?.name || 'N/A';
    await remove(itemRef);
    await addAuditLog('delete', 'budgetItem', id, `Deleted budget item: ${itemName}`);
};

export const listenToBudgetItems = (callback: (items: BudgetItem[]) => void) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    const itemsRef = ref(db, 'budgetItems');
    return onValue(itemsRef, (snapshot) => {
        const data = snapshot.val();
        callback(dataToBudgetItemArray(data));
    });
};

export const getBudgetItems = async (): Promise<BudgetItem[]> => {
    if (!db) return [];
    const itemsRef = ref(db, 'budgetItems');
    const snapshot = await get(itemsRef);
    return dataToBudgetItemArray(snapshot.val());
};

export const getBudgetItemById = async (id: string): Promise<BudgetItem | null> => {
    if (!db) return null;
    const itemRef = ref(db, `budgetItems/${id}`);
    const snapshot = await get(itemRef);
    if(snapshot.exists()) {
        return { id: snapshot.key, ...snapshot.val() };
    }
    return null;
}
