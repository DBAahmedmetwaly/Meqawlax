

import { db } from '@/lib/firebase';
import { ref, push, onValue, set, update } from 'firebase/database';
import { addAuditLog } from './auditLogService';

export interface User {
  id: string;
  name: string;
  code: string; // Login code
  pin: string; // Login PIN - should be stored securely
  jobId: string;
  isAdmin: boolean;
  status: 'نشط' | 'معلق';
}

const dataToUserArray = (data: any): User[] => {
    if (!data) return [];
    return Object.keys(data).map(key => ({
        id: key,
        ...data[key]
    }));
};

export const addUser = async (user: Omit<User, 'id'>) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const usersRef = ref(db, 'users');
    try {
        const newUserRef = push(usersRef);
        await set(newUserRef, user);
        const newId = newUserRef.key;
        if(newId) {
            await addAuditLog('create', 'user', newId, `Created user: ${user.name}`);
        }
        return newId;
    } catch (e) {
        console.error("Error adding user: ", e);
        throw new Error("Could not add user");
    }
};

export const listenToUsers = (callback: (users: User[]) => void) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    const usersRef = ref(db, 'users');
    return onValue(usersRef, (snapshot) => {
        const users = dataToUserArray(snapshot.val());
        callback(users);
    });
};

export const updateUser = async (userId: string, data: Partial<Omit<User, 'id'>>) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const userRef = ref(db, `users/${userId}`);
    try {
        await update(userRef, data);
        await addAuditLog('update', 'user', userId, `Updated user: ${data.name || 'Details updated'}`);
    } catch (e) {
        console.error("Error updating user: ", e);
        throw new Error("Could not update user");
    }
};
