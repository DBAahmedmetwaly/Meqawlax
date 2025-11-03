

import { db } from '@/lib/firebase';
import { ref, push, onValue, update, increment, get, set } from 'firebase/database';
import { addAuditLog } from './auditLogService';

export type Unit = 'قطعة' | 'كيلو' | 'متر' | 'لتر' | 'كرتون' | 'حبة' | 'كيس' | 'طن';

export interface Item {
  id: string;
  name: string;
  unit: Unit;
  stock: number;
  cost: number;
}

const dataToItemArray = (data: any): Item[] => {
    if (!data) return [];
    return Object.keys(data).map(key => ({
        id: key,
        ...data[key]
    }));
};

export const addItem = async (item: Omit<Item, 'id'>) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const itemsRef = ref(db, 'items');
    try {
        const newItemRef = push(itemsRef);
        await set(newItemRef, item);
        const newId = newItemRef.key;
        if(newId) {
            await addAuditLog('create', 'item', newId, `Created inventory item: ${item.name}`);
        }
        return newId;
    } catch (e) {
        console.error("Error adding item: ", e);
        throw new Error("Could not add item");
    }
};

export const listenToItems = (callback: (items: Item[]) => void) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    const itemsRef = ref(db, 'items');
    return onValue(itemsRef, (snapshot) => {
        const data = snapshot.val();
        callback(dataToItemArray(data));
    });
};

export const updateItemStock = async (itemId: string, quantity: number) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const itemRef = ref(db, `items/${itemId}`);
    try {
        await update(itemRef, {
            stock: increment(quantity)
        });
    } catch (e) {
        console.error("Error updating item stock: ", e);
        throw new Error("Could not update item stock");
    }
};

// This function will be used for purchase invoices to update stock and cost
export const updateItemStockAndCost = async (itemId: string, quantity: number, newCost: number) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const itemRef = ref(db, `items/${itemId}`);
    try {
        const itemSnap = await get(itemRef);
        if (!itemSnap.exists()) {
            throw new Error("Item not found");
        }
        const currentItem = itemSnap.val();
        const currentStock = currentItem.stock;
        const currentCost = currentItem.cost;

        const newStock = currentStock + quantity;
        const newAverageCost = newStock > 0 ? ((currentStock * currentCost) + (quantity * newCost)) / newStock : 0;
        
        await update(itemRef, {
            stock: newStock,
            cost: newAverageCost,
        });
    } catch(e) {
        console.error("Error updating item stock and cost: ", e);
        throw new Error("Could not update item stock and cost");
    }
};
