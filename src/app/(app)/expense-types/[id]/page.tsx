
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getExpenseTypeById, listenToExpenses, type Expense, type ExpenseType } from '@/services/expensesService';
import { listenToProjects, type Project } from '@/services/projectsService';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, LoaderCircle, DollarSign, BarChartHorizontal } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';

interface ProjectExpense {
    projectId: string;
    projectName: string;
    totalAmount: number;
}

export default function ExpenseTypeDetailsPage() {
  const params = useParams();
  const expenseTypeId = params.id as string;
  
  const [expenseType, setExpenseType] = useState<ExpenseType | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!expenseTypeId) return;

    setLoading(true);

    getExpenseTypeById(expenseTypeId).then(item => {
        setExpenseType(item);
    });

    const unsubscribeProjects = listenToProjects(setProjects);
    const unsubscribeExpenses = listenToExpenses(allExpenses => {
        const filtered = allExpenses.filter(exp => exp.expenseTypeId === expenseTypeId);
        setExpenses(filtered);
        setLoading(false);
    });

    return () => {
        unsubscribeProjects();
        unsubscribeExpenses();
    };
  }, [expenseTypeId]);

  const projectExpenseData: ProjectExpense[] = useMemo(() => {
    const data: { [key: string]: ProjectExpense } = {};

    expenses.forEach(expense => {
        if (!data[expense.projectId]) {
            const project = projects.find(p => p.id === expense.projectId);
            data[expense.projectId] = {
                projectId: expense.projectId,
                projectName: project?.name || 'مشروع غير محدد',
                totalAmount: 0
            };
        }
        data[expense.projectId].totalAmount += expense.amount;
    });

    return Object.values(data).sort((a,b) => b.totalAmount - a.totalAmount);
  }, [expenses, projects]);

  const totalSpent = useMemo(() => {
    return projectExpenseData.reduce((sum, item) => sum + item.totalAmount, 0);
  }, [projectExpenseData]);

  const chartConfig = {
    totalAmount: {
      label: 'إجمالي المصروفات',
      color: '#f97316',
    },
  } satisfies ChartConfig;

  const chartData = projectExpenseData.map(item => ({
    projectName: item.projectName,
    'إجمالي المصروفات': item.totalAmount,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        <p className="mr-4">جاري تحميل تفاصيل النوع...</p>
      </div>
    );
  }

  if (!expenseType) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">النوع غير موجود</h1>
        <Button asChild className="mt-4">
          <Link href="/expense-types">
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة إلى قائمة الأنواع
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div>
            <Link href="/expense-types" className="text-sm text-muted-foreground hover:underline flex items-center gap-1 mb-2">
                <ArrowRight className="h-4 w-4" />
                <span>العودة إلى كل الأنواع</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold">تحليل نوع المصروف: {expenseType.name}</h1>
        </div>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>ملخص</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <DollarSign className="h-8 w-8 text-primary" />
                <div>
                    <p className="text-sm text-muted-foreground">إجمالي المنصرف من هذا النوع</p>
                    <p className="font-bold font-mono text-xl">{totalSpent.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
                </div>
            </div>
             <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <BarChartHorizontal className="h-8 w-8 text-primary" />
                <div>
                    <p className="text-sm text-muted-foreground">عدد المشاريع التي استخدمت النوع</p>
                    <p className="font-bold font-mono text-xl">{projectExpenseData.length}</p>
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>توزيع المصروفات على المشاريع</CardTitle>
                 <CardDescription>عرض بياني يوضح أي المشاريع استهلكت هذا النوع من المصروفات بشكل أكبر.</CardDescription>
            </CardHeader>
            <CardContent>
                {chartData.length > 0 ? (
                 <ChartContainer config={chartConfig} className="h-[400px] w-full">
                    <ResponsiveContainer>
                        <BarChart layout="vertical" data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(value) => new Intl.NumberFormat('ar-EG', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
                            <YAxis type="category" dataKey="projectName" width={120} tick={{ fontSize: 12 }} />
                             <ChartTooltip
                                cursor={{fill: 'hsl(var(--muted))'}}
                                content={<ChartTooltipContent indicator="dot" />}
                            />
                            <Legend />
                            <Bar dataKey="إجمالي المصروفات" fill="var(--color-totalAmount)" radius={4} />
                        </BarChart>
                    </ResponsiveContainer>
                 </ChartContainer>
                ) : (
                    <div className="flex items-center justify-center h-48 text-muted-foreground">لم يتم استخدام هذا النوع بعد.</div>
                )}
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>سجل المصروفات</CardTitle>
                 <CardDescription>قائمة بجميع المصروفات المسجلة تحت هذا النوع.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto border rounded-lg max-h-[400px]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>التاريخ</TableHead>
                                <TableHead>المشروع</TableHead>
                                <TableHead className="text-left">المبلغ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses.length > 0 ? expenses.map(expense => (
                                <TableRow key={expense.id}>
                                    <TableCell>{expense.date}</TableCell>
                                    <TableCell>
                                        <Link href={`/projects/${expense.projectId}`} className="hover:underline text-primary">
                                            {projects.find(p => p.id === expense.projectId)?.name || 'غير معروف'}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-left font-mono">
                                        {expense.amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">لا توجد مصروفات لهذا النوع.</TableCell>
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
