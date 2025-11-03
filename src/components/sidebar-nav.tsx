
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { navItems } from '@/config/nav';
import { useAuth } from '@/contexts/AuthContext';

import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { useState } from 'react';


export function SidebarNav() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const [openMenus, setOpenMenus] = useState<string[]>(navItems.map(item => item.label));

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]
    );
  };

  const checkActive = (item: any) => {
    if (item.subItems) {
        return item.subItems.some((si: { href: string; }) => pathname.startsWith(si.href));
    }
    return item.href && pathname.startsWith(item.href);
  }
  
  const filteredNavItems = navItems.map(item => {
    if (!item.subItems) { // Always show items without sub-items if they have permission
        return hasPermission(item.href) ? item : null;
    }

    const filteredSubItems = item.subItems.filter(subItem => hasPermission(subItem.href));
    if (filteredSubItems.length === 0) return null; // Hide parent if no sub-items are accessible
    return { ...item, subItems: filteredSubItems };

  }).filter(Boolean);

  return (
    <SidebarMenu>
      {filteredNavItems.map((item) =>
        item.subItems ? (
          <SidebarMenuItem key={item.label} asChild>
            <Collapsible open={openMenus.includes(item.label)} onOpenChange={() => toggleMenu(item.label)}>
              <CollapsibleTrigger asChild>
                 <SidebarMenuButton
                    className="w-full justify-between"
                    tooltip={item.label}
                    variant={checkActive(item) ? 'default' : 'ghost'}
                  >
                   <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden data-[state=open]:rotate-180" />
                  </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent asChild>
                <SidebarMenuSub>
                  {item.subItems.map((subItem) => (
                     <SidebarMenuSubItem key={subItem.href}>
                        <Link href={subItem.href} passHref>
                           <SidebarMenuSubButton isActive={pathname.startsWith(subItem.href)}>
                            <subItem.icon className="ml-2 h-4 w-4" />
                            {subItem.label}
                           </SidebarMenuSubButton>
                        </Link>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenuItem>
        ) : (
          <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={checkActive(item)}
                  className="w-full justify-start"
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <div className="flex items-center gap-2">
                      <item.icon className="ml-2 h-4 w-4" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
          </SidebarMenuItem>
        )
      )}
    </SidebarMenu>
  );
}
