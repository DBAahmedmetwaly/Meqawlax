
'use client';

import { db } from '@/lib/firebase';
import { ref, push, set, onValue } from 'firebase/database';
import { format } from 'date-fns';
import { getUserSession } from './authService';

export type LogAction = 
    | 'create' | 'update' | 'delete' | 'login' | 'logout' 
    | 'payment' | 'transfer' | 'funding' | 'salary_payment' | 'inventory_withdrawal';

export interface AuditLog {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    action: LogAction;
    entity: string;
    entityId: string;
    details: string;
}

export const addAuditLog = async (
    action: LogAction, 
    entity: string, 
    entityId: string, 
    details: string
) => {
    if (!db) throw new Error("Firebase is not initialized.");

    const user = getUserSession();
    if (!user) {
        console.warn("Audit log skipped: No user session found.");
        return;
    }

    const logEntry: Omit<AuditLog, 'id'> = {
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: user.name,
        action,
        entity,
        entityId,
        details,
    };

    try {
        const logRef = ref(db, 'auditLogs');
        const newLogRef = push(logRef);
        await set(newLogRef, logEntry);
    } catch (e) {
        console.error("Failed to add audit log:", e);
    }
};

const dataToLogArray = (data: any): AuditLog[] => {
    if (!data) return [];
    return Object.keys(data).map(key => ({
        id: key,
        ...data[key]
    })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};


export const listenToAuditLogs = (callback: (logs: AuditLog[]) => void) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    const logRef = ref(db, 'auditLogs');
    return onValue(logRef, (snapshot) => {
        const data = snapshot.val();
        callback(dataToLogArray(data));
    });
};
