

import { db } from '@/lib/firebase';
import { ref, push, onValue, set, update, increment, get, child } from 'firebase/database';
import { addAuditLog } from './auditLogService';

export interface TreasuryAccount {
  id: string;
  name: string;
  type: 'خزينة' | 'بنك';
  balance: number;
}

const dataToTreasuryAccountArray = (data: any): TreasuryAccount[] => {
    if (!data) return [];
    return Object.keys(data).map(key => ({
        id: key,
        ...data[key]
    }));
};

export const addTreasuryAccount = async (account: Omit<TreasuryAccount, 'id'>) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const treasuryRef = ref(db, 'treasuryAccounts');
    try {
        const newAccountRef = push(treasuryRef);
        await set(newAccountRef, account);
        const newId = newAccountRef.key;
        if(newId) {
            await addAuditLog('create', 'treasuryAccount', newId, `Created treasury account: ${account.name}`);
        }
        return newId;
    } catch (e) {
        console.error("Error adding treasury account: ", e);
        throw new Error("Could not add treasury account");
    }
};

export const listenToTreasuryAccounts = (callback: (accounts: TreasuryAccount[]) => void) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    const treasuryRef = ref(db, 'treasuryAccounts');
    return onValue(treasuryRef, (snapshot) => {
        const data = snapshot.val();
        callback(dataToTreasuryAccountArray(data));
    });
};

export const getTreasuryAccountNameById = async (id: string): Promise<string | null> => {
  if (!db) return null;
  const accountRef = ref(db, `treasuryAccounts/${id}/name`);
  const snapshot = await get(accountRef);
  return snapshot.exists() ? snapshot.val() : null;
}

export const makeTransfer = async (fromId: string, toId: string, amount: number) => {
    if(!db) throw new Error("Firebase is not initialized.");

    const fromAccountName = await getTreasuryAccountNameById(fromId);
    const toAccountName = await getTreasuryAccountNameById(toId);

    const updates: { [key: string]: any } = {};
    updates[`/treasuryAccounts/${fromId}/balance`] = increment(-amount);
    updates[`/treasuryAccounts/${toId}/balance`] = increment(amount);

    try {
        await update(ref(db), updates);
        await addAuditLog('transfer', 'treasuryAccount', fromId, `Transferred ${amount} from ${fromAccountName} to ${toAccountName}`);
    } catch(e) {
        console.error("Error making transfer: ", e);
        throw new Error("Could not make transfer");
    }
};
