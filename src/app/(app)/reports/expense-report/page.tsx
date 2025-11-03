
'use client';

import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Search, LoaderCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { listenToExpenses, type Expense } from '@/services/expensesService';
import { listenToProjects, type Project } from '@/services/projectsService';
import { listenToExpenseTypes, type ExpenseType } from '@/services/expensesService';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';


export default function ExpenseReportPage() {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | 'all'>('all');
  
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const unsubExpenses = listenToExpenses(setAllExpenses);
    const unsubProjects = listenToProjects(setProjects);
    const unsubTypes = listenToExpenseTypes((types) => {
        setExpenseTypes(types);
        setLoading(false);
    });
    return () => {
        unsubExpenses();
        unsubProjects();
        unsubTypes();
    }
  }, []);
  
  const getProjectName = (projectId: string) => projects.find(p => p.id === projectId)?.name || 'غير معروف';

  const handleShowReport = () => {
    let reportData = allExpenses;
    
    if (selectedProjectId !== 'all') {
        reportData = reportData.filter(exp => exp.projectId === selectedProjectId);
    }
    if (selectedTypeId) {
        reportData = reportData.filter(exp => exp.expenseTypeId === selectedTypeId);
    }
    
    const reportTotal = reportData.reduce((sum, exp) => sum + exp.amount, 0);
    setFilteredExpenses(reportData);
    setTotal(reportTotal);

    if (reportData.length === 0) {
        toast({ title: "لا توجد بيانات", description: "لم يتم العثور على مصروفات تطابق معايير البحث.", variant: "default" });
    }
  };

  const handleExport = () => {
    if (filteredExpenses.length === 0) {
        toast({ title: 'خطأ', description: 'لا توجد بيانات للتصدير.', variant: 'destructive' });
        return;
    }

    const dataToExport = filteredExpenses.map(exp => ({
        'المشروع': getProjectName(exp.projectId),
        'نوع المصروف': exp.type,
        'البند': exp.budgetItemName || '-',
        'المبلغ': exp.amount,
        'البيان': exp.description,
        'التاريخ': exp.date,
      }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'تقرير_المصروفات');
    XLSX.writeFile(workbook, 'تقرير_المصروفات_المفصل.xlsx');
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">تقرير المصروفات التفصيلي</h1>
      <Card>
        <CardHeader>
          <CardTitle>إنشاء تقرير المصروفات</CardTitle>
          <CardDescription>حدد فئة المصروف والمشروع لعرض تقرير مفصل بجميع الحركات المتعلقة بها.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-end gap-4 mb-6">
                <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">اختر فئة المصروف</label>
                    <Select onValueChange={setSelectedTypeId} disabled={loading}>
                        <SelectTrigger>
                            <SelectValue placeholder="حدد فئة" />
                        </SelectTrigger>
                        <SelectContent>
                            {expenseTypes.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">اختر المشروع (اختياري)</label>
                    <Select onValueChange={setSelectedProjectId} defaultValue="all" disabled={loading}>
                        <SelectTrigger>
                            <SelectValue placeholder="كل المشاريع" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">كل المشاريع</SelectItem>
                            {projects.map(proj => <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={handleShowReport} disabled={loading}>
                    <Search className="ml-2 h-4 w-4" />
                    عرض التقرير
                </Button>
                 <Button variant="outline" onClick={handleExport} disabled={filteredExpenses.length === 0}>
                    <FileDown className="ml-2 h-4 w-4" />
                    تصدير
                </Button>
            </div>
          
            {loading ? (
                <div className="flex justify-center items-center h-48"><LoaderCircle className="animate-spin h-8 w-8 text-primary"/></div>
            ) : filteredExpenses.length > 0 ? (
            <Table>
                <TableCaption>تقرير المصروفات</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>المشروع</TableHead>
                        <TableHead>البيان</TableHead>
                        <TableHead>البند</TableHead>
                        <TableHead className="text-left">المبلغ (ج.م.)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredExpenses.map(exp => (
                        <TableRow key={exp.id}>
                            <TableCell>{exp.date}</TableCell>
                            <TableCell>{getProjectName(exp.projectId)}</TableCell>
                            <TableCell>{exp.description || exp.type}</TableCell>
                            <TableCell><Badge variant="outline">{exp.budgetItemName}</Badge></TableCell>
                            <TableCell className="text-left font-mono">{exp.amount.toLocaleString('ar-EG')}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                <tfoot className="border-t">
                  <TableRow>
                      <TableCell colSpan={4} className="text-left font-bold">الإجمالي</TableCell>
                      <TableCell className="text-left font-bold font-mono">{total.toLocaleString('ar-EG')}</TableCell>
                  </TableRow>
                </tfoot>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">سيتم عرض بيانات التقرير هنا بعد اختيار الفئة.</p>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
