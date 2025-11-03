

import { db } from '@/lib/firebase';
import { ref, push, onValue, set, update, increment } from 'firebase/database';
import { addAuditLog } from './auditLogService';

export interface Partner {
  id: string;
  name: string;
  totalInvestment: number;
}

const dataToPartnerArray = (data: any): Partner[] => {
    if (!data) return [];
    return Object.keys(data).map(key => ({
        id: key,
        ...data[key]
    }));
};

export const addPartner = async (partner: Omit<Partner, 'id'>) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const partnersRef = ref(db, 'partners');
    try {
        const newPartnerRef = push(partnersRef);
        await set(newPartnerRef, partner);
        const newId = newPartnerRef.key;
        if (newId) {
            await addAuditLog('create', 'partner', newId, `Created partner: ${partner.name}`);
        }
        return newId;
    } catch (e) {
        console.error("Error adding partner: ", e);
        throw new Error("Could not add partner");
    }
};

export const listenToPartners = (callback: (partners: Partner[]) => void) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    const partnersRef = ref(db, 'partners');
    return onValue(partnersRef, (snapshot) => {
        const data = snapshot.val();
        callback(dataToPartnerArray(data));
    });
};

export const updatePartnerInvestment = async (partnerId: string, amount: number) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const partnerRef = ref(db, `partners/${partnerId}`);
    try {
        await update(partnerRef, {
            totalInvestment: increment(amount)
        });
        // Logging is handled by higher-level functions like updateProjectPartners
    } catch (e) {
        console.error("Error updating partner investment: ", e);
        throw new Error("Could not update partner investment");
    }
};
