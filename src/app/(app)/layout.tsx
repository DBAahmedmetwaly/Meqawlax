

'use client';

import type { PropsWithChildren } from 'react';
import Link from 'next/link';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/sidebar-nav';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HardHat, LogOut, User, PanelLeft } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { ThemeSwitcher } from '@/components/theme-switcher';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { getSettings } from '@/services/settingsService';
import { useEffect, useState } from 'react';


function Header() {
    const { toggleSidebar } = useSidebar();
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background">
          <div className="flex h-16 items-center space-x-4 px-4 sm:justify-between sm:space-x-0">
            <div className="flex gap-6 md:gap-10">
                <Button variant="ghost" className="md:hidden" onClick={toggleSidebar} size="icon">
                    <PanelLeft className="h-5 w-5" />
                    <span className="sr-only">Toggle Menu</span>
                </Button>
            </div>
            
            <div className="flex flex-1 items-center justify-end space-x-4">
              <nav className="flex items-center space-x-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src="https://placehold.co/40x40" data-ai-hint="profile person" />
                        <AvatarFallback>{user?.name.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.isAdmin ? "مدير النظام" : "مستخدم"}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <User className="ml-2 h-4 w-4" />
                      <span>الملف الشخصي</span>
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                           <span>تبديل المظهر</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => setTheme('light')}>فاتح</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme('dark')}>داكن</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme('neutral')}>محايد</DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="ml-2 h-4 w-4" />
                      <span>تسجيل الخروج</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </nav>
            </div>
          </div>
        </header>
    );
}

function AppLayoutContent({ children }: PropsWithChildren) {
    const { state } = useSidebar();
    const { hasPermission } = useAuth();
    const pathname = usePathname();
    const [appName, setAppName] = useState("Bana'i");

    useEffect(() => {
        getSettings().then(settings => {
            if (settings.appName) {
                setAppName(settings.appName);
            }
        });
    }, []);

    // Do not render sidebar and header for unauthorized access to pages
    // Except for the home page, which is the welcome screen
    if (pathname !== '/' && !hasPermission(pathname)) {
        return (
            <div className="flex flex-col items-center justify-center h-screen w-full">
                <h1 className="text-2xl font-bold text-destructive">وصول مرفوض</h1>
                <p className="text-muted-foreground">ليس لديك الصلاحية للوصول إلى هذه الصفحة.</p>
                 <Button asChild className="mt-4">
                    <Link href="/">العودة إلى الرئيسية</Link>
                </Button>
            </div>
        );
    }

    return (
        <>
            <Sidebar collapsible="icon" variant="sidebar">
               <SidebarHeader className="border-b justify-between">
                <Link href="/" className="flex items-center gap-2.5 p-3 font-semibold text-lg">
                    <HardHat className="h-6 w-6 text-primary" />
                    <span className="group-data-[collapsible=icon]:hidden">{appName}</span>
                </Link>
                 <SidebarTrigger className="hidden md:flex" />
               </SidebarHeader>
               <SidebarContent>
                <SidebarNav />
               </SidebarContent>
            </Sidebar>
            <div className={cn(
                "flex min-w-0 flex-col flex-1 transition-[margin-right] duration-300 ease-in-out",
                "md:mr-[var(--sidebar-width)]",
                state === 'collapsed' && "md:mr-[var(--sidebar-width-icon)]"
            )}>
                <Header />
                <main className="flex-1 p-4 sm:p-6">
                  {children}
                </main>
            </div>
        </>
    );
}

export default function AppLayout({ children }: PropsWithChildren) {
  return (
    <SidebarProvider>
      <AuthProvider>
        <div className="flex">
          <AppLayoutContent>{children}</AppLayoutContent>
        </div>
      </AuthProvider>
    </SidebarProvider>
  );
}
