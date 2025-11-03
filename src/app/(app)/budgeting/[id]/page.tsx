
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { listenToExpenses, type Expense } from '@/services/expensesService';
import { listenToProjects, type Project } from '@/services/projectsService';
import { getBudgetItemById, type BudgetItem } from '@/services/budgetingService';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, LoaderCircle, DollarSign, PiggyBank, Receipt, TrendingDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { Progress } from '@/components/ui/progress';

interface ProjectExpenseData {
    projectId: string;
    projectName: string;
    allocatedAmount: number;
    spentAmount: number;
}

export default function BudgetItemDetailsPage() {
  const params = useParams();
  const budgetItemId = params.id as string;
  
  const [budgetItem, setBudgetItem] = useState<BudgetItem | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!budgetItemId) return;

    setLoading(true);

    getBudgetItemById(budgetItemId).then(item => {
        setBudgetItem(item);
    });

    const unsubscribeProjects = listenToProjects((data) => {
        setProjects(data);
        setLoading(false);
    });

    return () => {
        unsubscribeProjects();
    };
  }, [budgetItemId]);

  const projectsUsingItem = useMemo((): ProjectExpenseData[] => {
    if (!budgetItemId || projects.length === 0) return [];
    
    const relevantProjects: ProjectExpenseData[] = [];

    projects.forEach(project => {
        if (project.budgetItems) {
            const matchingBudgetItem = Object.values(project.budgetItems).find(item => item.globalBudgetItemId === budgetItemId);
            if (matchingBudgetItem) {
                relevantProjects.push({
                    projectId: project.id,
                    projectName: project.name,
                    allocatedAmount: matchingBudgetItem.allocatedAmount,
                    spentAmount: matchingBudgetItem.spentAmount,
                });
            }
        }
    });
    
    return relevantProjects.sort((a,b) => b.spentAmount - a.spentAmount);

  }, [projects, budgetItemId]);

  const summary = useMemo(() => {
    const totalAllocated = projectsUsingItem.reduce((sum, p) => sum + p.allocatedAmount, 0);
    const totalSpent = projectsUsingItem.reduce((sum, p) => sum + p.spentAmount, 0);
    const remaining = totalAllocated - totalSpent;
    const progress = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
    return { totalAllocated, totalSpent, remaining, progress };
  }, [projectsUsingItem]);

  const chartConfig = {
    spentAmount: {
      label: 'المصروف الفعلي',
      color: '#f97316',
    },
     allocatedAmount: {
      label: 'المبلغ المخصص',
      color: '#3b82f6',
    },
  } satisfies ChartConfig;

  const chartData = projectsUsingItem.map(item => ({
    projectName: item.projectName,
    'المصروف الفعلي': item.spentAmount,
    'المبلغ المخصص': item.allocatedAmount,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        <p className="mr-4">جاري تحميل تفاصيل البند...</p>
      </div>
    );
  }

  if (!budgetItem) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">البند غير موجود</h1>
        <Button asChild className="mt-4">
          <Link href="/budgeting">
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة إلى قائمة البنود
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div>
            <Link href="/budgeting" className="text-sm text-muted-foreground hover:underline flex items-center gap-1 mb-2">
                <ArrowRight className="h-4 w-4" />
                <span>العودة إلى كل البنود</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold">تحليل بند الموازنة: {budgetItem.name}</h1>
        </div>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>ملخص مالي للبند عبر كل المشاريع</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <DollarSign className="h-8 w-8 text-primary" />
                <div>
                    <p className="text-sm text-muted-foreground">إجمالي المخصص للبند</p>
                    <p className="font-bold font-mono text-xl">{summary.totalAllocated.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
                </div>
            </div>
             <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <TrendingDown className="h-8 w-8 text-destructive" />
                <div>
                    <p className="text-sm text-muted-foreground">إجمالي المنصرف من البند</p>
                    <p className="font-bold font-mono text-xl text-negative">{summary.totalSpent.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
                </div>
            </div>
             <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <PiggyBank className="h-8 w-8 text-green-600" />
                <div>
                    <p className="text-sm text-muted-foreground">الرصيد المتبقي</p>
                    <p className="font-bold font-mono text-xl text-positive">{summary.remaining.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
                </div>
            </div>
        </CardContent>
         <CardContent>
            <Progress value={summary.progress} className="w-full h-3" />
            <div className="flex justify-between text-xs mt-2">
                <span className="font-medium text-muted-foreground">نسبة الصرف: {summary.progress.toFixed(1)}%</span>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>توزيع المصروفات على المشاريع</CardTitle>
                 <CardDescription>عرض بياني يوضح أي المشاريع استهلكت هذا البند بشكل أكبر.</CardDescription>
            </CardHeader>
            <CardContent>
                {chartData.length > 0 ? (
                 <ChartContainer config={chartConfig} className="h-[400px] w-full">
                    <ResponsiveContainer>
                        <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tickFormatter={(value) => new Intl.NumberFormat('ar-EG', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
                            <YAxis type="category" dataKey="projectName" width={120} tick={{ fontSize: 12 }} />
                             <ChartTooltip
                                cursor={{fill: 'hsl(var(--muted))'}}
                                content={<ChartTooltipContent indicator="dot" />}
                            />
                            <Legend />
                            <Bar dataKey="المبلغ المخصص" fill="var(--color-allocatedAmount)" radius={4} />
                            <Bar dataKey="المصروف الفعلي" fill="var(--color-spentAmount)" radius={4} />
                        </BarChart>
                    </ResponsiveContainer>
                 </ChartContainer>
                ) : (
                    <div className="flex items-center justify-center h-48 text-muted-foreground">لم يتم استخدام هذا البند بعد في أي مشروع.</div>
                )}
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>سجل المشاريع</CardTitle>
                 <CardDescription>قائمة بجميع المشاريع التي تم تخصيص هذا البند لها.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto border rounded-lg max-h-[400px]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>المشروع</TableHead>
                                <TableHead className="text-left">المخصص</TableHead>
                                <TableHead className="text-left">المنصرف</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {projectsUsingItem.length > 0 ? projectsUsingItem.map(p => (
                                <TableRow key={p.projectId}>
                                    <TableCell>
                                        <Link href={`/projects/${p.projectId}`} className="hover:underline text-primary">
                                            {p.projectName}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-left font-mono">
                                        {p.allocatedAmount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                                    </TableCell>
                                    <TableCell className="text-left font-mono text-negative">
                                        {p.spentAmount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">لم يتم تخصيص هذا البند لأي مشروع.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
