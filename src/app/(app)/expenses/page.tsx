

'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Search, FileDown, LoaderCircle, Info, Trash2, Edit, WalletCards, Briefcase, Building, CalendarClock, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { listenToProjects, type Project } from '@/services/projectsService';
import { addExpense, listenToExpenses, deleteExpense, type Expense, updateExpense, listenToExpenseTypes, type ExpenseType } from '@/services/expensesService';
import { Textarea } from '@/components/ui/textarea';
import { listenToTreasuryAccounts, type TreasuryAccount } from '@/services/treasuryService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


function ExpensesPageComponent() {
  const searchParams = useSearchParams();
  const preselectedProjectId = searchParams.get('projectId');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const [dialogState, setDialogState] = useState<{ open: boolean, mode: 'add' | 'edit', expense?: Expense }>({ open: false, mode: 'add' });
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedProjectIdInForm, setSelectedProjectIdInForm] = useState<string | undefined>(preselectedProjectId || undefined);
  
  const selectedProjectInForm = useMemo(() => {
    return projects.find(p => p.id === selectedProjectIdInForm);
  }, [projects, selectedProjectIdInForm]);
  
  const projectFundForSelectedProject = useMemo(() => {
      if(!selectedProjectInForm || !selectedProjectInForm.treasuryAccountId) return null;
      return accounts.find(a => a.id === selectedProjectInForm.treasuryAccountId);
  }, [selectedProjectInForm, accounts])

  useEffect(() => {
    const unsubscribeExpenses = listenToExpenses(setExpenses);
    const unsubscribeAccounts = listenToTreasuryAccounts(setAccounts);
    const unsubscribeExpenseTypes = listenToExpenseTypes(setExpenseTypes);
    const unsubscribeProjects = listenToProjects((data) => {
        setProjects(data);
        if (preselectedProjectId) {
            setSelectedProjectIdInForm(preselectedProjectId);
        }
        setLoading(false);
    });

    return () => {
        unsubscribeExpenses();
        unsubscribeProjects();
        unsubscribeAccounts();
        unsubscribeExpenseTypes();
    }
  }, [preselectedProjectId]);
  
  const openDialog = (mode: 'add' | 'edit', expense?: Expense) => {
    setDialogState({ open: true, mode, expense });
    setDate(expense ? new Date(expense.date) : new Date());
    setSelectedProjectIdInForm(expense ? expense.projectId : preselectedProjectId || undefined);
  };
  
  const closeDialog = () => {
    setDialogState({ open: false, mode: 'add' });
    setDate(new Date());
    setSelectedProjectIdInForm(preselectedProjectId || undefined);
  }

  const handleSaveExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const projectId = formData.get('project') as string;
    const budgetItemId = formData.get('budgetItemId') as string;
    const expenseTypeId = formData.get('expenseTypeId') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const description = formData.get('description') as string;
    
    const project = projects.find(p => p.id === projectId);
    const accountId = project?.treasuryAccountId;
    const account = accountId ? accounts.find(a => a.id === accountId) : null;
    const budgetItem = budgetItemId ? project?.budgetItems?.[budgetItemId] : null;
    const expenseType = expenseTypes.find(et => et.id === expenseTypeId);

    if (!project || !budgetItemId || !amount || !accountId || !account || !budgetItem || !expenseType) {
        toast({ title: 'خطأ', description: 'البيانات غير مكتملة. تأكد من اختيار كافة الحقول.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }
    
    if (dialogState.mode === 'add' && account.balance < amount) {
        toast({ title: 'خطأ', description: 'رصيد صندوق المشروع المختار غير كافٍ.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }

    const expenseData: Omit<Expense, 'id'> = {
        projectId,
        type: expenseType.name, 
        amount,
        description,
        date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        budgetItemId: budgetItemId,
        budgetItemName: budgetItem.name,
        globalBudgetItemId: budgetItem.globalBudgetItemId,
        accountId: accountId,
        expenseTypeId: expenseType.id,
    };
    
    try {
        if(dialogState.mode === 'add') {
            await addExpense(expenseData, accountId, account.name);
            toast({ title: 'نجاح', description: 'تمت إضافة المصروف بنجاح.' });
        } else if (dialogState.mode === 'edit' && dialogState.expense) {
            await updateExpense(dialogState.expense, expenseData);
            toast({ title: 'نجاح', description: 'تم تعديل المصروف بنجاح.' });
        }
        closeDialog();
        form.reset();
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'لم يتم حفظ المصروف.';
        toast({ title: 'خطأ', description: errorMessage, variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleDeleteExpense = async (expense: Expense) => {
    if(window.confirm('هل أنت متأكد من حذف هذا المصروف؟ سيتم عكس كل آثاره المالية.')) {
        try {
            await deleteExpense(expense);
            toast({ title: 'نجاح', description: 'تم حذف المصروف بنجاح.' });
        } catch (error) {
            console.error(error);
            toast({ title: 'خطأ', description: 'فشل حذف المصروف.', variant: 'destructive' });
        }
    }
  }
  
  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'غير محدد';
  }
  
  const handleExport = () => {
    const dataToExport = expenses.map(expense => ({
      'المشروع': getProjectName(expense.projectId),
      'نوع المصروف': expense.type,
      'البند': expense.budgetItemName || '-',
      'المبلغ': expense.amount,
      'البيان': expense.description,
      'التاريخ': expense.date,
      'المستخدم': expense.createdByName,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'المصروفات');

    worksheet['!cols'] = [
        { wch: 25 }, // Project Name
        { wch: 20 }, // Expense Type
        { wch: 20 }, // Budget Item
        { wch: 10 }, // Amount
        { wch: 40 }, // Description
        { wch: 15 }, // Date
        { wch: 20 }, // User
    ];
    
    XLSX.writeFile(workbook, 'تقرير_المصروفات.xlsx');
    toast({ title: 'نجاح', description: 'تم تصدير تقرير المصروفات بنجاح.'});
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold">إدارة المصروفات النقدية</h1>
        <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => openDialog('add')}>
                <PlusCircle className="ml-2 h-4 w-4" />
                إضافة مصروف
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة المصروفات</CardTitle>
          <CardDescription>عرض وتصفية كافة المصروفات المسجلة.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
            <Input placeholder="بحث بالوصف أو المشروع..." className="w-full md:max-w-sm" />
            <Button variant="outline" className="w-full md:w-auto">
              <Search className="ml-2 h-4 w-4" />
              تصفية
            </Button>
          </div>
          {loading ? (
              <div className="flex items-center justify-center h-48">
                  <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
              </div>
          ) : (
             <>
                {/* Mobile View */}
                <div className="md:hidden space-y-4">
                  {expenses.length > 0 ? expenses.map((expense) => (
                    <Card key={expense.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-lg text-negative font-mono">
                          {expense.amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                        </span>
                        <div className="flex gap-1">
                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog('edit', expense)}>
                              <Edit className="h-4 w-4" />
                          </Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteExpense(expense)}>
                              <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-muted-foreground mt-2 text-sm">{expense.description || 'لا يوجد وصف'}</p>
                      <div className="mt-4 pt-4 border-t space-y-2 text-xs">
                          <div className="flex items-center gap-2"><Building className="h-4 w-4 text-primary" /><span>{getProjectName(expense.projectId)}</span></div>
                          <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /><span>{expense.budgetItemName}</span></div>
                          <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" /><span>{expense.date}</span></div>
                           <div className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /><span>{expense.createdByName || 'N/A'}</span></div>
                      </div>
                    </Card>
                  )) : (
                    <div className="text-center py-10">
                      <p>لا توجد مصروفات لعرضها.</p>
                    </div>
                  )}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto border rounded-lg">
                  <Table>
                  <TableHeader>
                      <TableRow>
                      <TableHead>المشروع</TableHead>
                      <TableHead>بند الموازنة</TableHead>
                      <TableHead>نوع المصروف</TableHead>
                      <TableHead className="text-left">المبلغ</TableHead>
                      <TableHead>البيان</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المستخدم</TableHead>
                      <TableHead className="text-center">إجراءات</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {expenses.length > 0 ? expenses.map((expense) => (
                      <TableRow key={expense.id}>
                          <TableCell className="font-medium">{getProjectName(expense.projectId)}</TableCell>
                          <TableCell>
                              <Badge variant="outline">{expense.budgetItemName || '-'}</Badge>
                          </TableCell>
                          <TableCell>{expense.type}</TableCell>
                          <TableCell className="text-left font-mono text-negative">{expense.amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell>{expense.date}</TableCell>
                          <TableCell><Badge variant="secondary">{expense.createdByName}</Badge></TableCell>
                           <TableCell className="text-center">
                              <Button variant="ghost" size="icon" onClick={() => openDialog('edit', expense)}>
                                  <Edit className="h-4 w-4" />
                              </Button>
                               <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteExpense(expense)}>
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </TableCell>
                      </TableRow>
                      )) : (
                         <TableRow>
                              <TableCell colSpan={8} className="h-24 text-center">
                                  لا توجد مصروفات لعرضها.
                              </TableCell>
                          </TableRow>
                      )}
                  </TableBody>
                  </Table>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4">
           <Button variant="outline" className="w-full sm:w-auto" onClick={handleExport} disabled={expenses.length === 0}>
              <FileDown className="ml-2 h-4 w-4"/>
              تصدير إلى Excel
          </Button>
          <p className="text-sm text-muted-foreground">
            الإجمالي: {expenses.length} مصروفات
          </p>
        </CardFooter>
      </Card>

       <Dialog open={dialogState.open} onOpenChange={(open) => !open && closeDialog()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{dialogState.mode === 'add' ? 'إضافة مصروف جديد' : 'تعديل مصروف'}</DialogTitle>
                    <DialogDescription>
                        {dialogState.mode === 'add' ? 'سيتم خصم هذا المصروف من الصندوق المالي الخاص بالمشروع المختار.' : 'قم بتعديل بيانات المصروف.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveExpense} className="space-y-4">
                    {projectFundForSelectedProject && (
                        <Alert>
                            <WalletCards className="h-4 w-4" />
                            <AlertTitle>مصدر الصرف: {projectFundForSelectedProject.name}</AlertTitle>
                            <AlertDescription>
                                الرصيد الحالي: {projectFundForSelectedProject.balance.toLocaleString('ar-EG', {style: 'currency', currency: 'EGP'})}
                            </AlertDescription>
                        </Alert>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="project">المشروع</Label>
                        <Select name="project" required defaultValue={dialogState.expense?.projectId || preselectedProjectId || undefined} disabled={isSubmitting || dialogState.mode === 'edit'} onValueChange={setSelectedProjectIdInForm}>
                            <SelectTrigger>
                                <SelectValue placeholder="اختر المشروع" />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="budgetItemId">تحميل على بند الموازنة</Label>
                            <Select name="budgetItemId" required disabled={isSubmitting || !selectedProjectInForm?.budgetItems} defaultValue={dialogState.expense?.budgetItemId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر بندًا لتخصيص المصروف عليه" />
                                </SelectTrigger>
                                <SelectContent>
                                    {selectedProjectInForm?.budgetItems && Object.entries(selectedProjectInForm.budgetItems).map(([id, item]) => (
                                        <SelectItem key={id} value={id}>{item.name} (المتبقي: {(item.allocatedAmount - item.spentAmount).toLocaleString('ar-EG')} ج.م)</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="expenseTypeId">نوع المصروف</Label>
                            <Select name="expenseTypeId" required disabled={isSubmitting} defaultValue={dialogState.expense?.expenseTypeId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر نوع المصروف" />
                                </SelectTrigger>
                                <SelectContent>
                                    {expenseTypes.map(et => (
                                        <SelectItem key={et.id} value={et.id}>{et.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">المبلغ</Label>
                            <Input id="amount" name="amount" type="number" placeholder="أدخل المبلغ" required disabled={isSubmitting} defaultValue={dialogState.expense?.amount}/>
                        </div>
                         <div className="space-y-2">
                            <Label>التاريخ</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    disabled={isSubmitting}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="ml-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>اختر تاريخ</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="description">البيان (اختياري)</Label>
                        <Textarea id="description" name="description" placeholder="وصف المصروف" disabled={isSubmitting} defaultValue={dialogState.expense?.description} />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                          <Button type="button" variant="secondary" disabled={isSubmitting}>إلغاء</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isSubmitting || (dialogState.mode === 'add' && !projectFundForSelectedProject)}>
                         {isSubmitting && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                         حفظ
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    </div>
  );
}


export default function ExpensesPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div>}>
            <ExpensesPageComponent />
        </Suspense>
    )
}

    
