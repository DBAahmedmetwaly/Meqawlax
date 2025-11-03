

import { db } from '@/lib/firebase';
import { ref, push, onValue, set, update, increment, get } from 'firebase/database';
import { format } from 'date-fns';
import { addAuditLog } from './auditLogService';

export interface Supplier {
  id: string;
  name: string;
  balance: number;
}

const dataToSupplierArray = (data: any): Supplier[] => {
    if (!data) return [];
    return Object.keys(data).map(key => ({
        id: key,
        ...data[key]
    }));
};

export const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const suppliersRef = ref(db, 'suppliers');
    try {
        const newSupplierRef = push(suppliersRef);
        await set(newSupplierRef, supplier);
        const newId = newSupplierRef.key;
        if(newId) {
            await addAuditLog('create', 'supplier', newId, `Created supplier: ${supplier.name}`);
        }
        return newId;
    } catch (e) {
        console.error("Error adding supplier: ", e);
        throw new Error("Could not add supplier");
    }
};

export const listenToSuppliers = (callback: (suppliers: Supplier[]) => void) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    const suppliersRef = ref(db, 'suppliers');
    return onValue(suppliersRef, (snapshot) => {
        const data = snapshot.val();
        callback(dataToSupplierArray(data));
    });
};

export interface SupplierPaymentParams {
    supplierId: string;
    supplierName: string;
    amount: number;
    accountId: string;
    accountName: string;
}

export const makeSupplierPayment = async (params: SupplierPaymentParams) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const { supplierId, supplierName, amount, accountId, accountName } = params;

    const supplierRef = ref(db, `suppliers/${supplierId}`);
    const supplierSnap = await get(supplierRef);
    if (!supplierSnap.exists() || supplierSnap.val().balance < amount) {
        throw new Error("رصيد المورد غير كافٍ لإتمام عملية السداد.");
    }
    
    const accountRef = ref(db, `treasuryAccounts/${accountId}`);
    const accountSnap = await get(accountRef);
    if (!accountSnap.exists() || accountSnap.val().balance < amount) {
        throw new Error("رصيد الخزينة أو البنك غير كافٍ لإتمام عملية السداد.");
    }

    try {
        const updates: { [key: string]: any } = {};

        // 1. Decrease supplier balance
        updates[`/suppliers/${supplierId}/balance`] = increment(-amount);
        
        // 2. Decrease treasury account balance
        updates[`/treasuryAccounts/${accountId}/balance`] = increment(-amount);

        // 3. Create journal entry
        const journalEntry = {
            date: format(new Date(), 'yyyy-MM-dd'),
            description: `سداد دفعة للمورد: ${supplierName}`,
            debitAccount: 'ذمم دائنة - الموردين',
            creditAccount: accountName,
            amount,
        };
        const newJournalKey = push(ref(db, 'journalEntries')).key;
        updates[`/journalEntries/${newJournalKey}`] = journalEntry;

        await update(ref(db), updates);
        await addAuditLog('payment', 'supplier', supplierId, `Paid ${amount} to supplier ${supplierName} from account ${accountName}.`);
    } catch (e) {
        console.error("Error making supplier payment: ", e);
        throw new Error("Could not make supplier payment.");
    }
};

/**
 * @deprecated Use makeSupplierPayment for new payments. This function is for direct balance updates.
 */
export const updateSupplierBalance = async (supplierId: string, amount: number) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const supplierRef = ref(db, `suppliers/${supplierId}`);
    try {
        await update(supplierRef, {
            balance: increment(amount)
        });
    } catch (e) {
        console.error("Error updating supplier balance: ", e);
        throw new Error("Could not update supplier balance");
    }
};
