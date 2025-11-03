

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
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
import { DollarSign, Search, LoaderCircle, CheckCircle, Clock, Calendar as CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { listenToCustomers, type Customer } from '@/services/customersService';
import { listenToTreasuryAccounts, type TreasuryAccount } from '@/services/treasuryService';
import { listenToInstallmentsByCustomer, payInstallment, type Installment } from '@/services/installmentsService';
import { Combobox } from '@/components/ui/combobox';
import { cn } from '@/lib/utils';
import { listenToProjects, type Project } from '@/services/projectsService';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';


export default function InstallmentsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allInstallments, setAllInstallments] = useState<Installment[]>([]);
  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [dueDateFilter, setDueDateFilter] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [paymentDialogState, setPaymentDialogState] = useState<{ open: boolean; installment: Installment | null }>({ open: false, installment: null });

  useEffect(() => {
    const unsubscribeCustomers = listenToCustomers(setCustomers);
    const unsubscribeAccounts = listenToTreasuryAccounts(setAccounts);
    const unsubscribeProjects = listenToProjects(setProjects);

    return () => {
        unsubscribeCustomers();
        unsubscribeAccounts();
        unsubscribeProjects();
    }
  }, []);

  useEffect(() => {
    if (!selectedCustomerId) {
        setAllInstallments([]);
        return;
    }
    setLoading(true);
    const unsubscribe = listenToInstallmentsByCustomer(selectedCustomerId, (data) => {
        setAllInstallments(data);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedCustomerId]);
  
  const filteredInstallments = useMemo(() => {
    if (!dueDateFilter) {
      return allInstallments;
    }
    return allInstallments.filter(inst => {
      const instDueDate = parseISO(inst.dueDate);
      return instDueDate <= dueDateFilter;
    });
  }, [allInstallments, dueDateFilter]);


  const handlePayInstallment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paymentDialogState.installment || !selectedCustomerId) return;
    
    setIsSubmitting(true);
    
    const project = projects.find(p => p.id === paymentDialogState.installment!.projectId);
    const projectFundId = project?.treasuryAccountId;
    const account = projectFundId ? accounts.find(a => a.id === projectFundId) : null;
    
    if(!account) {
        toast({ title: 'خطأ', description: 'لم يتم العثور على الصندوق المالي الخاص بالمشروع.', variant: 'destructive'});
        setIsSubmitting(false);
        return;
    }

    try {
        await payInstallment({
            installmentId: paymentDialogState.installment.id,
            customerId: selectedCustomerId,
            amount: paymentDialogState.installment.amount,
            accountId: account.id,
            accountName: account.name,
            projectId: project.id
        });
        toast({ title: 'نجاح', description: 'تم تسجيل الدفعة بنجاح.' });
        setPaymentDialogState({ open: false, installment: null });
    } catch (error) {
        console.error(error);
        toast({ title: 'خطأ', description: 'فشلت عملية السداد.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const getInstallmentStatusBadge = (status: Installment['status']) => {
    const statusMap: Record<Installment['status'], { icon: React.ElementType, className: string, label: string }> = {
        'مدفوع': { icon: CheckCircle, className: 'bg-green-100 text-green-800', label: 'مدفوع' },
        'مستحق': { icon: Clock, className: 'bg-blue-100 text-blue-800', label: 'مستحق' },
        'متأخر': { icon: Clock, className: 'text-red-800 border-red-300 bg-red-100', label: 'متأخر' },
    };
    const { icon: Icon, className, label } = statusMap[status];
    return (
        <Badge variant="secondary" className={cn('gap-1.5', className)}>
            <Icon className="h-3 w-3"/>
            {label}
        </Badge>
    );
  };
  
  const getProjectName = (projectId: string) => projects.find(p => p.id === projectId)?.name || 'مشروع غير معروف';


  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-semibold">إدارة الأقساط والفواتير</h1>
        <Card>
            <CardHeader>
                <CardTitle>عرض أقساط العملاء</CardTitle>
                <CardDescription>اختر عميلاً لعرض جدول الأقساط الخاص به، وقم بالبحث بتاريخ الاستحقاق لتصفية النتائج.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row items-end gap-4 mb-6 p-4 border rounded-md bg-muted/50">
                    <div className="flex-grow w-full space-y-2">
                        <Label>العميل</Label>
                        <Combobox
                            placeholder="ابحث عن عميل..."
                            notFoundText="لم يتم العثور على العميل."
                            options={customers.map(c => ({ value: c.id, label: c.name }))}
                            onSelect={(value) => setSelectedCustomerId(value)}
                            value={selectedCustomerId || ''}
                        />
                    </div>
                    <div className="w-full sm:w-auto space-y-2">
                         <Label>الأقساط المستحقة حتى تاريخ</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal bg-card",
                                    !dueDateFilter && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="ml-2 h-4 w-4" />
                                {dueDateFilter ? format(dueDateFilter, "PPP") : <span>اختر تاريخ</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                mode="single"
                                selected={dueDateFilter}
                                onSelect={setDueDateFilter}
                                initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : selectedCustomerId && filteredInstallments.length > 0 ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>تاريخ الاستحقاق</TableHead>
                                    <TableHead>المشروع</TableHead>
                                    <TableHead className="text-left">المبلغ</TableHead>
                                    <TableHead>الحالة</TableHead>
                                    <TableHead className="text-center">إجراء</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {filteredInstallments.map(inst => (
                                    <TableRow key={inst.id} className={inst.status === 'متأخر' ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                                        <TableCell>{inst.dueDate}</TableCell>
                                        <TableCell>{getProjectName(inst.projectId)}</TableCell>
                                        <TableCell className="text-left font-mono">
                                            {inst.amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                                        </TableCell>
                                        <TableCell>{getInstallmentStatusBadge(inst.status)}</TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={inst.status !== 'مستحق' && inst.status !== 'متأخر'}
                                                onClick={() => setPaymentDialogState({ open: true, installment: inst })}
                                            >
                                                <DollarSign className="ml-2 h-4 w-4" />
                                                سداد
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">
                            {selectedCustomerId ? "لا توجد أقساط تطابق معايير البحث." : "الرجاء اختيار عميل لعرض أقساطه."}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogState.open} onOpenChange={(open) => !open && setPaymentDialogState({ open: false, installment: null })}>
            <DialogContent>
                 <DialogHeader>
                    <DialogTitle>سداد قسط</DialogTitle>
                    <CardDescription>
                       تأكيد سداد قسط مستحق بقيمة <span className="font-bold text-primary">{paymentDialogState.installment?.amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP'})}</span>
                    </CardDescription>
                </DialogHeader>
                <form onSubmit={handlePayInstallment} className="space-y-4">
                     <p className="text-sm text-muted-foreground">
                        سيتم إيداع هذا المبلغ تلقائيًا في الصندوق المالي الخاص بالمشروع.
                    </p>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmitting}>إلغاء</Button></DialogClose>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                            تأكيد السداد
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    </div>
  );
}
