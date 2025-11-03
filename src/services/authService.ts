

'use client';

import { db } from '@/lib/firebase';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import type { User } from './usersService';
import type { Job, ScreenPermissions } from './jobsService';
import { addAuditLog } from './auditLogService';

export interface AuthenticatedUser extends User {
    permissions: ScreenPermissions;
}

const SESSION_KEY = 'bana-i-auth-session';

/**
 * Simulates a server-side authentication check.
 * In a real-world scenario, this logic would be on a secure server.
 */
export async function authenticateUser(code: string, pin: string): Promise<AuthenticatedUser | null> {
    if (!db) throw new Error("Firebase is not initialized.");

    const usersRef = ref(db, 'users');
    
    try {
        const snapshot = await get(usersRef);
        if (!snapshot.exists()) {
            return null; // No users in the database
        }
        
        const allUsers = snapshot.val();
        let foundUser: User | null = null;
        let foundUserId: string | null = null;

        for (const userId in allUsers) {
            if (allUsers[userId].code === code) {
                foundUserId = userId;
                foundUser = allUsers[userId];
                break;
            }
        }
        
        if (!foundUser || !foundUserId) {
            return null; // User with this code not found
        }

        const user: User = { id: foundUserId, ...foundUser };

        if (user.pin === pin) {
            // Fetch job permissions
            const jobRef = ref(db, `jobs/${user.jobId}`);
            const jobSnapshot = await get(jobRef);
            
            let permissions: ScreenPermissions = {};
            if (jobSnapshot.exists()) {
                const jobData: Job = jobSnapshot.val();
                permissions = jobData.permissions || {};
            }
            
            const authenticatedUser = { ...user, permissions };
            storeUserSession(authenticatedUser); // Store session immediately after successful auth
            await addAuditLog('login', 'user', user.id, `User ${user.name} logged in successfully.`);
            return authenticatedUser;
        }
        
        return null; // PIN is incorrect
    } catch (error) {
        console.error("Authentication error: ", error);
        throw new Error("Failed to authenticate user.");
    }
}

// --- Client-side Session Management ---

export function storeUserSession(user: AuthenticatedUser): void {
    if (typeof window !== 'undefined') {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    }
}

export function getUserSession(): AuthenticatedUser | null {
    if (typeof window !== 'undefined') {
        const session = window.localStorage.getItem(SESSION_KEY);
        if (session) {
            return JSON.parse(session);
        }
    }
    return null;
}

export async function clearUserSession(): Promise<void> {
    if (typeof window !== 'undefined') {
        const user = getUserSession();
        if (user) {
            await addAuditLog('logout', 'user', user.id, `User ${user.name} logged out.`);
        }
        window.localStorage.removeItem(SESSION_KEY);
    }
}
