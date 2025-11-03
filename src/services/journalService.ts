
import { db } from '@/lib/firebase';
import { ref, push, onValue, set } from 'firebase/database';

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
}

const dataToJournalEntryArray = (data: any): JournalEntry[] => {
    if (!data) return [];
    return Object.keys(data).map(key => ({
        id: key,
        ...data[key]
    }));
};

export const addJournalEntry = async (entry: Omit<JournalEntry, 'id'>) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const journalRef = ref(db, 'journalEntries');
    try {
        const newEntryRef = push(journalRef);
        await set(newEntryRef, entry);
        return newEntryRef.key;
    } catch (e) {
        console.error("Error adding journal entry: ", e);
        throw new Error("Could not add journal entry");
    }
};

export const listenToJournalEntries = (callback: (entries: JournalEntry[]) => void) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    const journalRef = ref(db, 'journalEntries');
    return onValue(journalRef, (snapshot) => {
        const data = snapshot.val();
        callback(dataToJournalEntryArray(data));
    });
};
