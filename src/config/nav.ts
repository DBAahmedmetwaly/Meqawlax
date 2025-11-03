
import {
  BookOpenCheck,
  Briefcase,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Contact,
  FileText,
  FolderKanban,
  Landmark,
  LayoutDashboard,
  Package,
  Receipt,
  ScrollText,
  Settings,
  Truck,
  Users,
  UsersRound,
  Shield,
  ShoppingCart,
  ArrowRightLeft,
  HardHat,
  Wrench,
  CalendarDays,
  Handshake,
  List,
  BarChartHorizontal,
  Home,
  Building,
  DollarSign,
  File,
  BarChart,
  Users2,
  ListChecks,
  History,
} from 'lucide-react';


interface NavSubItem {
    href: string;
    label: string;
    icon: React.ElementType;
}

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    subItems?: NavSubItem[];
}

export const navItems = [
  { href: '/', label: 'صفحة البداية', icon: Home },
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/projects', label: 'المشاريع', icon: HardHat },
  {
    label: 'المالية والمحاسبة',
    icon: ScrollText,
    href: '/financials', // A placeholder parent href
    subItems: [
        { href: '/expenses', label: 'المصروفات النقدية', icon: Receipt },
        { href: '/journal', label: 'قيود اليومية', icon: ClipboardList },
        { href: '/treasury', label: 'الخزينة والبنوك', icon: Landmark },
        { href: '/reports/general-ledger', label: 'دفتر الأستاذ العام', icon: BookOpenCheck },
        { href: '/budgeting', label: 'بنود الموازنات', icon: List },
        { href: '/expense-types', label: 'أنواع المصروفات', icon: ListChecks },
    ],
  },
  {
    label: 'الجهات',
    icon: Contact,
    href: '/parties',
    subItems: [
        { href: '/customers', label: 'العملاء', icon: Users },
        { href: '/suppliers', label: 'الموردين', icon: Truck },
        { href: '/partners', label: 'الشركاء', icon: Handshake },
        { href: '/installments', label: 'الأقساط والفواتير', icon: CalendarDays },
    ],
  },
   {
    label: 'المخازن والمشتريات',
    icon: Package,
    href: '/inventory-management',
    subItems: [
        { href: '/inventory', label: 'أصناف المخزون', icon: Package },
        { href: '/purchases', label: 'فواتير الشراء', icon: ShoppingCart },
        { href: '/inventory/movements', label: 'حركة المخزون', icon: ArrowRightLeft },
    ],
  },
  {
    label: 'الموظفين',
    icon: UsersRound,
    href: '/hr',
    subItems: [
        { href: '/employees', label: 'قائمة الموظفين', icon: Users },
        { href: '/salaries', label: 'الرواتب', icon: CircleDollarSign },
    ],
  },
   { href: '/reports', label: 'التقارير', icon: FileText },
   { 
     label: 'الإدارة',
     icon: Shield,
     href: '/admin',
     subItems: [
        { href: '/users', label: 'المستخدمين', icon: Users },
        { href: '/jobs', label: 'الوظائف والصلاحيات', icon: Briefcase },
        { href: '/admin/audit-log', label: 'سجل المراجعة', icon: History },
        { href: '/settings', label: 'الإعدادات', icon: Settings },
     ]
   }
];
