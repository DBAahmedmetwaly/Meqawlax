
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
import { Badge } from "@/components/ui/badge";
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';

export default function DashboardPage() {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

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
    
    const projectOptions = useMemo(() => {
        const options = projects.map(p => ({ value: p.id, label: p.name }));
        options.unshift({ value: 'all', label: 'كل المشاريع' });
        return options;
    }, [projects]);
    
    const filteredProjects = useMemo(() => {
        if (selectedProjectId === 'all') return projects;
        return projects.filter(p => p.id === selectedProjectId);
    }, [projects, selectedProjectId]);

    const kpiData = useMemo(() => {
        const activeProjects = filteredProjects.filter(p => p.status === 'نشط').length;
        const totalLiquidity = accounts.reduce((sum, acc) => sum + acc.balance, 0);
        const totalRevenue = filteredProjects.reduce((sum, p) => sum + (p.collectedFromSales || 0), 0);
        const totalExpenses = filteredProjects.reduce((sum, p) => sum + p.spent, 0);
        return { activeProjects, totalLiquidity, totalRevenue, totalExpenses };
    }, [filteredProjects, accounts]);

    const projectPerformanceData = useMemo(() => {
        return filteredProjects.map(p => ({
            name: p.name,
            'التكلفة التقديرية': p.estimatedCosts,
            'المصروف الفعلي': p.spent
        }));
    }, [filteredProjects]);
    
    const chartConfig = {
      'التكلفة التقديرية': {
        label: 'التكلفة التقديرية',
        color: '#3b82f6',
      },
      'المصروف الفعلي': {
        label: 'المصروف الفعلي',
        color: '#f97316',
      },
    } satisfies ChartConfig;

    const recentExpenses = useMemo(() => {
        const relevantExpenses = selectedProjectId === 'all' 
            ? expenses 
            : expenses.filter(e => e.projectId === selectedProjectId);

        return [...relevantExpenses]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
    }, [expenses, selectedProjectId]);

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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">لوحة التحكم</h1>
                    <p className="text-muted-foreground">مرحباً بك مجدداً، {user?.name || 'مستخدم'}! إليك نظرة سريعة على أداء النظام.</p>
                </div>
                 <div className="w-full md:w-auto md:max-w-xs space-y-2">
                    <Label>تصفية حسب المشروع</Label>
                    <Combobox
                        placeholder="اختر مشروعًا..."
                        notFoundText="لم يتم العثور على المشروع."
                        options={projectOptions}
                        value={selectedProjectId}
                        onSelect={setSelectedProjectId}
                    />
                </div>
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
                        <p className="text-xs text-muted-foreground">
                            {selectedProjectId === 'all' ? `من أصل ${projects.length} مشروع` : 'مشروع محدد'}
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي السيولة (الكلي)</CardTitle>
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
                        <p className="text-xs text-muted-foreground">من مبيعات الوحدات للمشاريع المحددة</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-negative">{kpiData.totalExpenses.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</div>
                        <p className="text-xs text-muted-foreground">على المشاريع المحددة</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts and Recent Activity */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>أداء المشاريع</CardTitle>
                        <CardDescription>مقارنة بين التكاليف التقديرية والمصروفات الفعلية للمشاريع المحددة.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {projectPerformanceData.length > 0 ? (
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
                        ) : (
                            <div className="flex items-center justify-center h-[350px]">
                                <p className="text-muted-foreground">لا توجد بيانات لعرضها في الرسم البياني.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>آخر الحركات</CardTitle>
                        <CardDescription>عرض لآخر 5 مصروفات تم تسجيلها للمشاريع المحددة.</CardDescription>
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
                                        <TableCell className="text-left font-mono text-negative">{exp.amount.toLocaleString('ar-EG')}</TableCell>
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

    