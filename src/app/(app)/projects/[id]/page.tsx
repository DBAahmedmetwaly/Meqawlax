

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { listenToProject, type Project } from '@/services/projectsService';
import { listenToExpensesByProjectId, type Expense } from '@/services/expensesService';
import { listenToTreasuryAccounts, type TreasuryAccount } from '@/services/treasuryService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, LoaderCircle, DollarSign, TrendingDown, TrendingUp, ArrowLeft, PlusCircle, Settings, Palette, Banknote, Handshake, Building } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { listenToJournalEntries, type JournalEntry } from '@/services/journalService';


const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff4d4d'];

interface LedgerEntry {
    date: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projectFund, setProjectFund] = useState<TreasuryAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    const unsubscribeProject = listenToProject(projectId, (projectData) => {
        setProject(projectData);
        if(projectData) setLoading(false);
    });
    const unsubscribeExpenses = listenToExpensesByProjectId(projectId, (expensesData) => {
        setExpenses(expensesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });
    const unsubscribeJournal = listenToJournalEntries(setJournalEntries);
    return () => {
      unsubscribeProject();
      unsubscribeExpenses();
      unsubscribeJournal();
    };
  }, [projectId]);
  
  useEffect(() => {
    if (project?.treasuryAccountId) {
        const unsub = listenToTreasuryAccounts((accounts) => {
            const fund = accounts.find(a => a.id === project.treasuryAccountId);
            setProjectFund(fund || null);
        });
        return () => unsub();
    }
  }, [project?.treasuryAccountId]);
  
  const projectLedger = useMemo((): LedgerEntry[] => {
    if (!projectFund) return [];

    const relevantEntries = journalEntries.filter(
        entry => entry.debitAccount === projectFund.name || entry.creditAccount === projectFund.name
    ).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const ledger: LedgerEntry[] = [];

    relevantEntries.forEach(entry => {
        const debit = entry.debitAccount === projectFund.name ? entry.amount : 0;
        const credit = entry.creditAccount === projectFund.name ? entry.amount : 0;
        runningBalance += (debit - credit);
        ledger.push({
            date: entry.date,
            description: entry.description,
            debit,
            credit,
            balance: runningBalance
        })
    })

    return ledger;
  }, [journalEntries, projectFund])

  const budgetChartData = useMemo(() => {
    if (!project || !project.budgetItems) return [];
    return Object.values(project.budgetItems).map(item => ({
        name: item.name,
        'المبلغ المخصص': item.allocatedAmount,
        'المصروف الفعلي': item.spentAmount,
    }));
  }, [project]);

  const budgetChartConfig: ChartConfig = {
    'المبلغ المخصص': {
        label: "المبلغ المخصص",
        color: "#3b82f6",
    },
    'المصروف الفعلي': {
        label: "المصروف الفعلي",
        color: "#f97316",
    },
  };
  
  const expenseChartData = useMemo(() => {
    const expenseTypes: { [key: string]: number } = {};
    expenses.forEach(expense => {
      const type = expense.budgetItemName || expense.type;
      if (!expenseTypes[type]) {
        expenseTypes[type] = 0;
      }
      expenseTypes[type] += expense.amount;
    });
    return Object.keys(expenseTypes).map(type => ({
      name: type,
      value: expenseTypes[type],
    }));
  }, [expenses]);
  

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        <p className="mr-4">جاري تحميل تفاصيل المشروع...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">المشروع غير موجود</h1>
        <p className="text-muted-foreground">قد يكون المشروع الذي تبحث عنه قد تم حذفه.</p>
        <Button asChild className="mt-4">
          <Link href="/projects">
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة إلى قائمة المشاريع
          </Link>
        </Button>
      </div>
    );
  }

  const progress = project.estimatedCosts > 0 ? (project.spent / project.estimatedCosts) * 100 : 0;
  const projectedProfit = (project.collectedFromSales || 0) - project.spent;

  return (
    <div className="space-y-6">
      {/* Header */}
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div>
            <Link href="/projects" className="text-sm text-muted-foreground hover:underline flex items-center gap-1 mb-2">
                <ArrowRight className="h-4 w-4" />
                <span>العودة إلى كل المشاريع</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground max-w-xl">{project.description}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-shrink-0">
             <Button variant="secondary" onClick={() => router.push(`/projects/manage?id=${projectId}`)} className="w-full">
                <Settings className="ml-2 h-4 w-4" />
                إدارة المشروع
            </Button>
            <Button asChild className="w-full">
                <Link href={`/expenses?projectId=${projectId}`}>
                    <PlusCircle className="ml-2 h-4 w-4" />
                    إضافة مصروف
                </Link>
            </Button>
        </div>
      </div>
      
      {/* Financial Summary Card */}
       <Card>
        <CardHeader>
            <CardTitle>الملخص المالي</CardTitle>
            <CardDescription>نظرة سريعة على الوضع المالي الحالي للمشروع.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <div>
                <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-muted-foreground">المنصرف: <span className="font-mono">{project.spent.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</span></span>
                    <span className="font-medium text-muted-foreground">التكلفة التقديرية: <span className="font-mono">{project.estimatedCosts.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</span></span>
                </div>
                <Progress value={progress} className="w-full h-2" />
                <div className="flex justify-between text-xs mt-1">
                     <span className="font-medium">تقدم الصرف: {progress.toFixed(1)}%</span>
                </div>
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                    <Banknote className="h-6 w-6 text-cyan-500"/>
                    <div>
                        <p className="text-sm text-muted-foreground">رصيد صندوق المشروع</p>
                        <p className="font-bold font-mono">{projectFund?.balance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }) || '0'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <DollarSign className="h-6 w-6 text-green-500"/>
                    <div>
                        <p className="text-sm text-muted-foreground">إيرادات المبيعات</p>
                        <p className="font-bold font-mono">{(project.collectedFromSales || 0).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Handshake className="h-6 w-6 text-purple-500"/>
                    <div>
                        <p className="text-sm text-muted-foreground">تمويل الشركاء</p>
                        <p className="font-bold font-mono">{(project.collectedFromPartners || 0).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-blue-500"/>
                    <div>
                        <p className="text-sm text-muted-foreground">الربح المحقق/المتوقع</p>
                        <p className="font-bold font-mono">{projectedProfit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <TrendingDown className="h-6 w-6 text-destructive"/>
                    <div>
                        <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
                        <p className="font-bold font-mono">{project.spent.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
                    </div>
                </div>
            </div>
        </CardContent>
       </Card>
      
      {/* Detailed content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>أداء الموازنة</CardTitle>
                <CardDescription>
                    مقارنة بين المبالغ المخصصة والمصروفات الفعلية لكل بند.
                </CardDescription>
            </CardHeader>
            <CardContent className="w-full">
                {budgetChartData.length > 0 ? (
                  <ChartContainer config={budgetChartConfig} className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={budgetChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
                            <XAxis type="number" tickFormatter={(value) => new Intl.NumberFormat('ar-EG', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
                            <ChartTooltip
                                cursor={{fill: 'hsl(var(--muted))'}}
                                content={<ChartTooltipContent indicator="dot" />}
                            />
                            <Legend />
                            <Bar dataKey="المبلغ المخصص" fill={'#3b82f6'} radius={4} />
                            <Bar dataKey="المصروف الفعلي" fill={'#f97316'} radius={4} />
                        </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                        <Palette className="h-8 w-8 mb-2"/>
                        <p>لا توجد بيانات موازنة لعرضها.</p>
                        <p className="text-xs">أضف بنود موازنة ومصروفات من صفحة إدارة المشروع.</p>
                    </div>
                )}
            </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>تحليل المصروفات</CardTitle>
            <CardDescription>
              توزيع إجمالي المصروفات على الأنواع المختلفة.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expenseChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                    data={expenseChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    >
                    {expenseChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })} />
                    <Legend />
                </PieChart>
                </ResponsiveContainer>
            ) : (
                 <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                    <TrendingDown className="h-8 w-8 mb-2"/>
                    <p>لا توجد بيانات مصروفات لعرضها.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
            <CardHeader>
                <CardTitle>كشف حساب صندوق المشروع</CardTitle>
                <CardDescription>سجل بجميع الحركات المالية التي تمت على الصندوق الخاص بالمشروع.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="overflow-x-auto border rounded-lg max-h-[400px]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>التاريخ</TableHead>
                                <TableHead>البيان</TableHead>
                                <TableHead className="text-left text-positive">وارد</TableHead>
                                <TableHead className="text-left text-negative">صادر</TableHead>
                                <TableHead className="text-left">الرصيد</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {projectLedger.length > 0 ? projectLedger.map((entry, index) => (
                                <TableRow key={index}>
                                    <TableCell>{entry.date}</TableCell>
                                    <TableCell>{entry.description}</TableCell>
                                    <TableCell className="text-left font-mono text-positive">{entry.debit > 0 ? entry.debit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }) : '-'}</TableCell>
                                    <TableCell className="text-left font-mono text-negative">{entry.credit > 0 ? entry.credit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }) : '-'}</TableCell>
                                    <TableCell className="text-left font-mono">{entry.balance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        لا توجد حركات مالية مسجلة لصندوق هذا المشروع بعد.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
