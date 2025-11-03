


import { db } from '@/lib/firebase';
import { ref, get, set } from 'firebase/database';
import { addAuditLog } from './auditLogService';

export interface AppSettings {
  appName: string;
  currency: 'EGP' | 'USD' | 'SAR';
  costOverrunStrategy: 'reduceProfitMargin' | 'increasePrice';
  toastDuration: number;
}

const defaultSettings: AppSettings = {
    appName: "Bana'i Tracker",
    currency: 'EGP',
    costOverrunStrategy: 'reduceProfitMargin',
    toastDuration: 5000, // Default to 5 seconds
};

export const getSettings = async (): Promise<AppSettings> => {
  if (!db) return defaultSettings;
  try {
    const settingsRef = ref(db, 'settings/global');
    const snapshot = await get(settingsRef);
    if (snapshot.exists()) {
      return { ...defaultSettings, ...snapshot.val() };
    }
    return defaultSettings;
  } catch (error) {
    console.error("Error fetching settings: ", error);
    return defaultSettings;
  }
};

export const updateSettings = async (settings: AppSettings): Promise<void> => {
  if (!db) throw new Error("Firebase is not initialized.");
  try {
    const settingsRef = ref(db, 'settings/global');
    await set(settingsRef, settings);
    await addAuditLog('update', 'settings', 'global', `Updated application settings.`);
  } catch (error) {
    console.error("Error updating settings: ", error);
    throw new Error("Could not update settings");
  }
};
