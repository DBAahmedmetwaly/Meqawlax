
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  PlusCircle,
  MoreVertical,
  Gift,
  CircleArrowDown,
  FilePenLine,
  Undo2,
  HandCoins,
  LoaderCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { listenToJobs, type Job } from '@/services/jobsService';
import { addEmployee, listenToEmployees, type Employee } from '@/services/employeesService';
import { listenToTreasuryAccounts, type TreasuryAccount } from '@/services/treasuryService';


export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [dialogState, setDialogState] = useState({ open: false, type: '', employeeId: '' });
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribeJobs = listenToJobs(setJobs);
    const unsubscribeEmployees = listenToEmployees((employeesData) => {
        setEmployees(employeesData);
        setLoading(false);
    });
    const unsubscribeAccounts = listenToTreasuryAccounts(setAccounts);
    
    return () => {
        unsubscribeJobs();
        unsubscribeEmployees();
        unsubscribeAccounts();
    }
  }, [])

  const handleAction = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const amount = parseFloat(formData.get('amount') as string);
    const accountId = formData.get('accountId') as string;
    const { type, employeeId } = dialogState;

    console.log({type, employeeId, amount, accountId});

    toast({ title: "نجاح (مؤقت)", description: "تم تنفيذ الإجراء بنجاح." });
    setDialogState({ open: false, type: '', employeeId: '' });
    setIsSubmitting(false);
  };
  
  const handleAddEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const jobId = formData.get('jobId') as string;
    const salary = parseFloat(formData.get('salary') as string);

    const job = jobs.find(j => j.id === jobId);

    if (!name || !jobId || !job) {
        toast({ title: 'خطأ', description: 'الرجاء تعبئة جميع الحقول المطلوبة', variant: 'destructive'});
        setIsSubmitting(false);
        return;
    }

    const newEmployee: Omit<Employee, 'id'> = {
      name,
      jobId,
      position: job.title,
      salary: salary || job.salary,
      advances: 0,
      custody: 0,
      rewards: 0,
      status: 'على رأس العمل',
    };
    
    try {
        await addEmployee(newEmployee);
        toast({ title: "نجاح", description: `تمت إضافة الموظف ${name} بنجاح.` });
        setDialogState({ open: false, type: '', employeeId: '' });
        form.reset();
    } catch(error) {
        toast({ title: "خطأ", description: 'لم يتم إضافة الموظف', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const openDialog = (type: string, employeeId = '') => {
    setDialogState({ open: true, type, employeeId });
  };

  const getDialogContent = () => {
    const { type, employeeId } = dialogState;
    const employee = employees.find(e => e.id === employeeId);

    switch(type) {
        case 'addEmployee':
            return (
                <>
                <DialogHeader><DialogTitle>إضافة موظف جديد</DialogTitle></DialogHeader>
                <form onSubmit={handleAddEmployee} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">اسم الموظف</Label>
                        <Input id="name" name="name" placeholder="أدخل اسم الموظف" required disabled={isSubmitting} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="jobId">الوظيفة</Label>
                        <Select name="jobId" required disabled={isSubmitting}>
                            <SelectTrigger><SelectValue placeholder="اختر الوظيفة" /></SelectTrigger>
                            <SelectContent>
                                {jobs.map(job => <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="salary">الراتب (بالجنيه المصري)</Label>
                        <Input id="salary" name="salary" type="number" placeholder="سيتم استخدام الراتب الأساسي إذا ترك فارغاً" disabled={isSubmitting} />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmitting}>إلغاء</Button></DialogClose>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                            حفظ
                        </Button>
                    </DialogFooter>
                </form>
                </>
            );
        case 'disburseAdvance':
        case 'disburseCustody':
            return (
                <>
                <DialogHeader><DialogTitle>{type === 'disburseAdvance' ? 'صرف سلفة' : 'صرف عهدة'} للموظف: {employee?.name}</DialogTitle></DialogHeader>
                 <form onSubmit={handleAction} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">المبلغ</Label>
                        <Input id="amount" name="amount" type="number" placeholder="أدخل المبلغ" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="accountId">مصدر الصرف</Label>
                        <Select name="accountId" required>
                            <SelectTrigger><SelectValue placeholder="اختر الخزينة أو البنك" /></SelectTrigger>
                            <SelectContent>
                                {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{`${acc.name} (${acc.balance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })})`}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter><DialogClose asChild><Button type="button" variant="secondary">إلغاء</Button></DialogClose><Button type="submit">صرف</Button></DialogFooter>
                </form>
                </>
            );
        case 'settleAdvance':
        case 'settleCustody':
             return (
                <>
                <DialogHeader><DialogTitle>{type === 'settleAdvance' ? 'تسوية سلفة' : 'تسوية عهدة'} للموظف: {employee?.name}</DialogTitle></DialogHeader>
                 <form onSubmit={handleAction} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">مبلغ التسوية</Label>
                        <Input id="amount" name="amount" type="number" placeholder="أدخل المبلغ" required max={type === 'settleAdvance' ? employee?.advances : employee?.custody} />
                        <p className="text-xs text-muted-foreground">الرصيد الحالي: {(type === 'settleAdvance' ? employee?.advances : employee?.custody)?.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
                    </div>
                    <DialogFooter><DialogClose asChild><Button type="button" variant="secondary">إلغاء</Button></DialogClose><Button type="submit">تسوية</Button></DialogFooter>
                </form>
                </>
            );
        case 'addReward':
             return (
                <>
                <DialogHeader><DialogTitle>إضافة مكافأة للموظف: {employee?.name}</DialogTitle></DialogHeader>
                 <form onSubmit={handleAction} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">مبلغ المكافأة</Label>
                        <Input id="amount" name="amount" type="number" placeholder="أدخل المبلغ" required />
                    </div>
                    <DialogFooter><DialogClose asChild><Button type="button" variant="secondary">إلغاء</Button></DialogClose><Button type="submit">إضافة</Button></DialogFooter>
                </form>
                </>
            );
        default: return null;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">قائمة الموظفين</h1>
          <p className="text-muted-foreground">
            إدارة بيانات الموظفين، السلف، المكافآت والرواتب.
          </p>
        </div>
        <Button onClick={() => openDialog('addEmployee')} className="w-full sm:w-auto">
            <PlusCircle className="ml-2 h-4 w-4" />
            إضافة موظف جديد
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        {loading ? (
            <div className="flex items-center justify-center h-48">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم الموظف</TableHead>
                  <TableHead>المنصب</TableHead>
                  <TableHead className="text-left">الراتب</TableHead>
                  <TableHead className="text-left">السلف</TableHead>
                  <TableHead className="text-left">العهد</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length > 0 ? employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                       <span>{employee.name}</span>
                    </TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell className="text-left font-mono">
                      {employee.salary.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                    </TableCell>
                    <TableCell className="text-left font-mono text-negative">
                      {employee.advances.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                    </TableCell>
                    <TableCell className="text-left font-mono text-attention">
                      {employee.custody.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          employee.status === 'على رأس العمل' ? 'default' : 'secondary'
                        }
                        className={employee.status === 'على رأس العمل' ? 'bg-green-600 text-white' : ''}
                      >
                        {employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => { /* Edit not implemented */ }}>
                            <FilePenLine className="ml-2 h-4 w-4" />
                            <span>تعديل</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator/>
                          <DropdownMenuItem onClick={() => openDialog('disburseAdvance', employee.id)}>
                            <CircleArrowDown className="ml-2 h-4 w-4" />
                            <span>صرف سلفة</span>
                          </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => openDialog('settleAdvance', employee.id)} disabled={employee.advances <= 0}>
                            <Undo2 className="ml-2 h-4 w-4" />
                            <span>تسوية سلفة</span>
                          </DropdownMenuItem>
                           <DropdownMenuSeparator/>
                          <DropdownMenuItem onClick={() => openDialog('disburseCustody', employee.id)}>
                            <HandCoins className="ml-2 h-4 w-4" />
                            <span>صرف عهدة</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDialog('settleCustody', employee.id)} disabled={employee.custody <= 0}>
                             <Undo2 className="ml-2 h-4 w-4" />
                            <span>تسوية عهدة</span>
                          </DropdownMenuItem>
                           <DropdownMenuSeparator/>
                          <DropdownMenuItem onClick={() => openDialog('addReward', employee.id)}>
                            <Gift className="ml-2 h-4 w-4" />
                            <span>إضافة مكافأة</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                   <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                          لا يوجد موظفين لعرضهم. قم بإضافة موظف جديد للبدء.
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          )}
      </div>
      
       <Dialog open={dialogState.open} onOpenChange={(open) => setDialogState({ ...dialogState, open })}>
          <DialogContent>
            {getDialogContent()}
          </DialogContent>
        </Dialog>
    </div>
  );
}
