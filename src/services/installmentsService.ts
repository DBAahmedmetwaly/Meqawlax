

import { db } from '@/lib/firebase';
import { ref, push, onValue, set, query, orderByChild, equalTo, update, increment, child, get } from 'firebase/database';
import { format, addMonths, addQuarters, addYears, parseISO } from 'date-fns';

export interface Installment {
    id: string;
    customerId: string;
    projectId: string;
    unitId: string;
    amount: number;
    dueDate: string;
    status: 'مستحق' | 'مدفوع' | 'متأخر';
    paymentDate?: string;
}

const dataToInstallmentArray = (data: any): Installment[] => {
    if (!data) return [];
    const array = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
    }));
    // Check status for overdue installments
    const today = new Date();
    today.setHours(0,0,0,0);
    return array.map(inst => {
        if (inst.status === 'مستحق' && parseISO(inst.dueDate) < today) {
            return { ...inst, status: 'متأخر' };
        }
        return inst;
    }).sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
};

export const createInstallmentPlan = async (
    customerId: string, 
    projectId: string, 
    unitId: string, 
    totalAmount: number, 
    count: number, 
    frequency: 'monthly' | 'quarterly' | 'yearly'
) => {
    if (!db) throw new Error("Firebase is not initialized.");
    if (count <= 0) return;

    const installmentAmount = Math.round((totalAmount / count) * 100) / 100;
    const installmentsRef = ref(db, 'installments');
    const updates: { [key: string]: any } = {};
    let currentDate = new Date();

    for (let i = 0; i < count; i++) {
        switch(frequency) {
            case 'monthly':
                currentDate = addMonths(currentDate, 1);
                break;
            case 'quarterly':
                currentDate = addQuarters(currentDate, 1);
                break;
            case 'yearly':
                currentDate = addYears(currentDate, 1);
                break;
        }

        const newInstallment: Omit<Installment, 'id'> = {
            customerId,
            projectId,
            unitId,
            amount: i === count - 1 ? (totalAmount - (installmentAmount * (count - 1))) : installmentAmount, // Adjust last installment
            dueDate: format(currentDate, 'yyyy-MM-dd'),
            status: 'مستحق',
        };
        
        const newInstallmentKey = push(installmentsRef).key;
        if (newInstallmentKey) {
            updates[`/installments/${newInstallmentKey}`] = newInstallment;
        }
    }

    try {
        await update(ref(db), updates);
    } catch(e) {
        console.error("Error creating installment plan: ", e);
        throw new Error("Could not create installment plan");
    }
};

export const listenToInstallmentsByCustomer = (customerId: string, callback: (installments: Installment[]) => void) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    const installmentsRef = ref(db, 'installments');
    const q = query(installmentsRef, orderByChild('customerId'), equalTo(customerId));
    return onValue(q, (snapshot) => {
        const data = snapshot.val();
        callback(dataToInstallmentArray(data));
    });
};

export const listenToInstallmentsByUnitId = (unitId: string, callback: (installments: Installment[]) => void) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    const installmentsRef = ref(db, 'installments');
    const q = query(installmentsRef, orderByChild('unitId'), equalTo(unitId));
    return onValue(q, (snapshot) => {
        callback(dataToInstallmentArray(snapshot.val()));
    });
};

export interface PayInstallmentParams {
    installmentId: string;
    customerId: string;
    projectId: string;
    amount: number;
    accountId: string;
    accountName: string;
}

export const payInstallment = async (params: PayInstallmentParams) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const { installmentId, customerId, amount, accountId, accountName, projectId } = params;

    try {
        const updates: { [key: string]: any } = {};

        // 1. Update installment status
        updates[`/installments/${installmentId}/status`] = 'مدفوع';
        updates[`/installments/${installmentId}/paymentDate`] = format(new Date(), 'yyyy-MM-dd');
        
        // 2. Update customer balance (decrease debt)
        updates[`/customers/${customerId}/balance`] = increment(-amount);
        
        // 3. Update treasury account balance (increase cash in project fund)
        updates[`/treasuryAccounts/${accountId}/balance`] = increment(amount);
        
        // 4. Create journal entry
        const journalEntry = {
            date: format(new Date(), 'yyyy-MM-dd'),
            description: `تحصيل قسط من عميل للمشروع`,
            debitAccount: accountName,
            creditAccount: `ذمم مدينة - العملاء`,
            amount,
        };
        const newJournalKey = push(child(ref(db), 'journalEntries')).key;
        updates[`/journalEntries/${newJournalKey}`] = journalEntry;

        await update(ref(db), updates);
    } catch (e) {
        console.error("Error paying installment: ", e);
        throw new Error("Could not pay installment");
    }
};
