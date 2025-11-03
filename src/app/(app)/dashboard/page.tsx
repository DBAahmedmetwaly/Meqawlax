
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HardHat, DollarSign, HandCoins, TrendingUp, TrendingDown, Landmark, Receipt, LoaderCircle } from "lucide-react";
import { listenToProjects, type Project } from '@/services/projectsService';
import { listenToTreasuryAccounts, type TreasuryAccount } from '@/services/treasuryService';
import { listenToExpenses, type Expense } from '@/services/expensesService';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubProjects = listenToProjects(setProjects);
        const unsubAccounts = listenToTreasuryAccounts(setAccounts);
        const unsubExpenses = listenToExpenses((data) => {
            setExpenses(data);
            setLoading(false); // Set loading to false after the last data set is fetched
        });

        return () => {
            unsubProjects();
            unsubAccounts();
            unsubExpenses();
        }
    }, []);

    const kpiData = useMemo(() => {
        const activeProjects = projects.filter(p => p.status === 'نشط').length;
        const totalLiquidity = accounts.reduce((sum, acc) => sum + acc.balance, 0);
        const totalRevenue = projects.reduce((sum, p) => sum + (p.collectedFromSales || 0), 0);
        const totalExpenses = projects.reduce((sum, p) => sum + p.spent, 0);
        return { activeProjects, totalLiquidity, totalRevenue, totalExpenses };
    }, [projects, accounts]);

    const projectPerformanceData = useMemo(() => {
        return projects.map(p => ({
            name: p.name,
            'التكلفة التقديرية': p.estimatedCosts,
            'المصروف الفعلي': p.spent
        }));
    }, [projects]);
    
    const chartConfig = {
      'التكلفة التقديرية': {
        label: 'التكلفة التقديرية',
        color: 'hsl(var(--chart-1))',
      },
      'المصروف الفعلي': {
        label: 'المصروف الفعلي',
        color: 'hsl(var(--chart-2))',
      },
    } satisfies ChartConfig;

    const recentExpenses = useMemo(() => {
        // Sort expenses by date descending and then slice
        return [...expenses]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
    }, [expenses]);

    if(loading) {
         return (
            <div className="flex items-center justify-center h-full">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                <p className="mr-4">جاري تحميل بيانات لوحة التحكم...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">لوحة التحكم</h1>
                    <p className="text-muted-foreground">مرحباً بك مجدداً، {user?.name || 'مستخدم'}! إليك نظرة سريعة على أداء النظام.</p>
                </div>
                 <Button asChild>
                    <Link href="/projects">
                        <HardHat className="ml-2 h-4 w-4" />
                        إدارة المشاريع
                    </Link>
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">المشاريع النشطة</CardTitle>
                        <HardHat className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpiData.activeProjects}</div>
                        <p className="text-xs text-muted-foreground">من أصل {projects.length} مشروع</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي السيولة</CardTitle>
                        <Landmark className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">{kpiData.totalLiquidity.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</div>
                        <p className="text-xs text-muted-foreground">في جميع الخزائن والبنوك</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">{kpiData.totalRevenue.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</div>
                        <p className="text-xs text-muted-foreground">من مبيعات الوحدات</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">{kpiData.totalExpenses.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</div>
                        <p className="text-xs text-muted-foreground">على جميع المشاريع</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts and Recent Activity */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>أداء المشاريع</CardTitle>
                        <CardDescription>مقارنة بين التكاليف التقديرية والمصروفات الفعلية.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[350px] w-full">
                            <ResponsiveContainer>
                                <BarChart data={projectPerformanceData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                    <YAxis tickFormatter={(value) => new Intl.NumberFormat('ar-EG', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                    <Legend />
                                    <Bar dataKey="التكلفة التقديرية" fill={chartConfig['التكلفة التقديرية'].color} radius={4} />
                                    <Bar dataKey="المصروف الفعلي" fill={chartConfig['المصروف الفعلي'].color} radius={4} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>آخر الحركات</CardTitle>
                        <CardDescription>عرض لآخر 5 مصروفات تم تسجيلها في النظام.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>المشروع</TableHead>
                                    <TableHead>البيان</TableHead>
                                    <TableHead className="text-left">المبلغ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentExpenses.length > 0 ? recentExpenses.map(exp => (
                                    <TableRow key={exp.id}>
                                        <TableCell>
                                            <Badge variant="outline">{projects.find(p => p.id === exp.projectId)?.name || 'غير معروف'}</Badge>
                                        </TableCell>
                                        <TableCell className="font-medium truncate" title={exp.description}>{exp.description || exp.type}</TableCell>
                                        <TableCell className="text-left font-mono">{exp.amount.toLocaleString('ar-EG')}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">لا توجد مصروفات حديثة.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
