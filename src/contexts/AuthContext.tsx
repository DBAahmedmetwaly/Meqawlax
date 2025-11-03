

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
    authenticateUser, 
    storeUserSession, 
    getUserSession, 
    clearUserSession,
    type AuthenticatedUser
} from '@/services/authService';
import { LoaderCircle } from 'lucide-react';
import { type ScreenPermissions, type ActionPermissions } from '@/services/jobsService';

type PermissionAction = keyof Omit<ActionPermissions, 'print'>;

interface AuthContextType {
    user: AuthenticatedUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (code: string, pin: string) => Promise<AuthenticatedUser | null>;
    logout: () => void;
    hasPermission: (path: string, action?: PermissionAction) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<AuthenticatedUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const session = getUserSession();
        if (session) {
            setUser(session);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (!isLoading && !user && pathname !== '/login') {
            router.replace('/login');
        }
    }, [user, isLoading, pathname, router]);


    const login = async (code: string, pin: string) => {
        const authenticatedUser = await authenticateUser(code, pin);
        if (authenticatedUser) {
            storeUserSession(authenticatedUser);
            setUser(authenticatedUser);
            return authenticatedUser;
        }
        return null;
    };

    const logout = () => {
        clearUserSession();
        setUser(null);
        router.replace('/login');
    };
    
    const hasPermission = (path: string, action: PermissionAction = 'view'): boolean => {
        if (!user) return false;
        if (user.isAdmin) return true;

        if (path === '/' || path === '/dashboard') return true;

        // Find the most specific permission that matches the start of the path
        const matchingPermissionKey = Object.keys(user.permissions)
            .filter(p => path.startsWith(p))
            .sort((a, b) => b.length - a.length)[0];

        if (!matchingPermissionKey) return false;

        const permission = user.permissions[matchingPermissionKey];
        if (!permission) return false;

        return permission[action] ?? false;
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin" />
                <p className="mr-4">جاري التحقق من جلسة المستخدم...</p>
            </div>
        );
    }
    
     if (!user && pathname !== '/login') {
        return (
             <div className="flex h-screen w-full items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin" />
                <p className="mr-4">إعادة توجيه إلى صفحة الدخول...</p>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
