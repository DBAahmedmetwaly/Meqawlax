

import { db } from '@/lib/firebase';
import { ref, push, onValue, set, remove, update, get } from 'firebase/database';
import { addAuditLog } from './auditLogService';

export interface ActionPermissions {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  print: boolean;
}

export type ScreenPermissions = {
  [path: string]: Partial<ActionPermissions>;
};

export interface Job {
  id: string;
  title: string;
  salary: number;
  permissions: ScreenPermissions;
}

const dataToJobArray = (data: any): Job[] => {
    if (!data) return [];
    return Object.keys(data).map(key => ({
        id: key,
        ...data[key]
    }));
};

export const addJob = async (job: Omit<Job, 'id'>) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const jobsRef = ref(db, 'jobs');
    try {
        const newJobRef = push(jobsRef);
        await set(newJobRef, job);
        const newId = newJobRef.key;
        if(newId) {
            await addAuditLog('create', 'job', newId, `Created job: ${job.title}`);
        }
        return newId;
    } catch (e) {
        console.error("Error adding job: ", e);
        throw new Error("Could not add job");
    }
};

export const listenToJobs = (callback: (jobs: Job[]) => void) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    const jobsRef = ref(db, 'jobs');
    return onValue(jobsRef, (snapshot) => {
        const data = snapshot.val();
        callback(dataToJobArray(data));
    });
};

export const updateJob = async (jobId: string, data: Partial<Omit<Job, 'id'>>) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const jobDocRef = ref(db, `jobs/${jobId}`);
    try {
        await update(jobDocRef, data);
        await addAuditLog('update', 'job', jobId, `Updated job: ${data.title || 'Permissions updated'}`);
    } catch (e) {
        console.error("Error updating job: ", e);
        throw new Error("Could not update job");
    }
};

export const deleteJob = async (jobId: string) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const jobDocRef = ref(db, `jobs/${jobId}`);
    try {
        const snapshot = await get(jobDocRef);
        const job = snapshot.val();
        await remove(jobDocRef);
        await addAuditLog('delete', 'job', jobId, `Deleted job: ${job?.title || 'N/A'}`);
    } catch (e) {
        console.error("Error deleting job: ", e);
        throw new Error("Could not delete job");
    }
};
