
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, LoaderCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { listenToEmployees, paySalaries, type Employee } from '@/services/employeesService';
import { listenToTreasuryAccounts, type TreasuryAccount } from '@/services/treasuryService';


export default function SalariesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setLoading(true);
        const unsubscribeEmployees = listenToEmployees(data => {
            setEmployees(data);
            setLoading(false);
        });
        const unsubscribeAccounts = listenToTreasuryAccounts(setAccounts);

        return () => {
            unsubscribeEmployees();
            unsubscribeAccounts();
        };
    }, []);

    const calculateNetSalary = (emp: Employee) => {
        return emp.salary + emp.rewards - emp.advances;
    };
    
    const totalNetSalaries = employees.reduce((sum, emp) => sum + calculateNetSalary(emp), 0);

    const handlePaySalaries = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(event.currentTarget);
        const accountId = formData.get('accountId') as string;

        if (!accountId) {
            toast({ title: 'خطأ', description: 'الرجاء اختيار حساب الصرف', variant: 'destructive'});
            setIsSubmitting(false);
            return;
        }

        const selectedAccount = accounts.find(acc => acc.id === accountId);
        if (!selectedAccount || selectedAccount.balance < totalNetSalaries) {
            toast({ title: 'خطأ', description: 'رصيد الحساب المختار غير كافٍ لدفع الرواتب.', variant: 'destructive'});
            setIsSubmitting(false);
            return;
        }
        
        try {
            await paySalaries(employees, totalNetSalaries, accountId, selectedAccount.name);
            toast({ title: 'نجاح', description: 'تم دفع الرواتب بنجاح.'});
            setDialogOpen(false);
        } catch (error) {
            console.error(error);
            toast({ title: 'خطأ', description: 'فشلت عملية دفع الرواتب.', variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold">مسير الرواتب</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button disabled={loading || employees.length === 0} className="w-full sm:w-auto">
                    <DollarSign className="ml-2 h-4 w-4" />
                    دفع الرواتب
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>تأكيد عملية دفع الرواتب</DialogTitle>
                </DialogHeader>
                 <form onSubmit={handlePaySalaries} className="space-y-4">
                    <p>
                        سيتم دفع مبلغ إجمالي قدره <span className="font-bold text-primary">{totalNetSalaries.toLocaleString('ar-EG', {style: 'currency', currency: 'EGP'})}</span>.
                        الرجاء تحديد مصدر الصرف.
                    </p>
                    <div className="space-y-2">
                        <Label htmlFor="accountId">الصرف من حساب</Label>
                        <Select name="accountId" required disabled={isSubmitting}>
                            <SelectTrigger>
                                <SelectValue placeholder="اختر الخزينة أو البنك" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{`${acc.name} (${acc.balance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })})`}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmitting}>إلغاء</Button></DialogClose>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                            تأكيد الدفع
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>كشف مسير الرواتب</CardTitle>
          <CardDescription>عرض تفاصيل رواتب الموظفين المستحقة لهذا الشهر.</CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : employees.length > 0 ? (
                <div className="overflow-x-auto">
                    <Table>
                        <TableCaption>قائمة برواتب الموظفين المستحقة.</TableCaption>
                        <TableHeader>
                        <TableRow>
                            <TableHead>اسم الموظف</TableHead>
                            <TableHead className="text-left">الراتب الأساسي</TableHead>
                            <TableHead className="text-left">المكافآت</TableHead>
                            <TableHead className="text-left">السلف</TableHead>
                            <TableHead className="text-left font-bold">صافي الراتب</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees.map(emp => (
                                <TableRow key={emp.id}>
                                    <TableCell className="font-medium">{emp.name}</TableCell>
                                    <TableCell className="text-left font-mono">{emp.salary.toLocaleString('ar-EG')}</TableCell>
                                    <TableCell className="text-left font-mono text-green-600">{emp.rewards.toLocaleString('ar-EG')}</TableCell>
                                    <TableCell className="text-left font-mono text-destructive">{emp.advances.toLocaleString('ar-EG')}</TableCell>
                                    <TableCell className="text-left font-mono font-bold">{calculateNetSalary(emp).toLocaleString('ar-EG')}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                         <tfoot className="border-t">
                            <TableRow>
                                <TableCell colSpan={4} className="text-left font-bold text-lg">الإجمالي المستحق للدفع</TableCell>
                                <TableCell className="text-left font-bold font-mono text-lg text-primary">{totalNetSalaries.toLocaleString('ar-EG')}</TableCell>
                            </TableRow>
                        </tfoot>
                    </Table>
                </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">لا يوجد موظفون لعرضهم.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
