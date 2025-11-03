

'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreVertical, Landmark, Wallet, ArrowRightLeft, LoaderCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { addTreasuryAccount, listenToTreasuryAccounts, makeTransfer, type TreasuryAccount } from '@/services/treasuryService';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function TreasuryPage() {
  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToTreasuryAccounts((data) => {
        setAccounts(data);
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const type = formData.get('type') as TreasuryAccount['type'];
    const balance = formData.get('balance') as string;
    
    if (!name || !type) {
      toast({ title: "خطأ", description: "الرجاء تعبئة الحقول المطلوبة.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const newAccount: Omit<TreasuryAccount, 'id'> = {
        name,
        type,
        balance: parseFloat(balance) || 0,
    };
    
    try {
        await addTreasuryAccount(newAccount);
        toast({ title: "نجاح", description: "تمت إضافة الحساب بنجاح."});
        setAddAccountOpen(false);
        form.reset();
    } catch (error) {
        toast({ title: "خطأ", description: "لم تتم إضافة الحساب.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleTransfer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsTransferring(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const fromAccountId = formData.get('fromAccount') as string;
    const toAccountId = formData.get('toAccount') as string;
    const amount = parseFloat(formData.get('amount') as string);
    
    const fromAccount = accounts.find(a => a.id === fromAccountId);

    if (fromAccountId === toAccountId) {
        toast({ title: "خطأ", description: "لا يمكن التحويل إلى نفس الحساب.", variant: "destructive" });
        setIsTransferring(false);
        return;
    }

    if (!fromAccount || fromAccount.balance < amount) {
        toast({ title: "خطأ", description: "رصيد الحساب المحول منه غير كاف.", variant: "destructive" });
        setIsTransferring(false);
        return;
    }
    
    try {
        await makeTransfer(fromAccountId, toAccountId, amount);
        toast({ title: "نجاح", description: `تم تحويل ${amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP'})} بنجاح.` });
        setTransferOpen(false);
        form.reset();
    } catch (error) {
        toast({ title: "خطأ", description: "فشلت عملية التحويل.", variant: "destructive" });
    } finally {
        setIsTransferring(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">الخزينة والبنوك</h1>
          <p className="text-muted-foreground">عرض وإدارة الأرصدة والحركات المالية هنا.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
                 <DialogTrigger asChild>
                    <Button variant="outline" disabled={accounts.length < 2} className="w-full">
                        <ArrowRightLeft className="ml-2 h-4 w-4" />
                        تحويل مالي
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>إجراء تحويل مالي بين الحسابات</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleTransfer} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fromAccount">من حساب</Label>
                            <Select name="fromAccount" required disabled={isTransferring}>
                                <SelectTrigger><SelectValue placeholder="اختر الحساب" /></SelectTrigger>
                                <SelectContent>
                                    {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{`${acc.name} (${acc.balance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })})`}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="toAccount">إلى حساب</Label>
                            <Select name="toAccount" required disabled={isTransferring}>
                                <SelectTrigger><SelectValue placeholder="اختر الحساب" /></SelectTrigger>
                                <SelectContent>
                                    {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{`${acc.name} (${acc.balance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })})`}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="amount">المبلغ</Label>
                            <Input id="amount" name="amount" type="number" placeholder="أدخل مبلغ التحويل" required disabled={isTransferring}/>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary" disabled={isTransferring}>إلغاء</Button></DialogClose>
                            <Button type="submit" disabled={isTransferring}>
                                {isTransferring && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                                تنفيذ التحويل
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
                <DialogTrigger asChild>
                    <Button className="w-full">
                        <PlusCircle className="ml-2 h-4 w-4" />
                        إضافة حساب
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>إضافة حساب خزينة أو بنك</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddAccount} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">اسم الحساب</Label>
                            <Input id="name" name="name" placeholder="مثال: خزينة المكتب" required disabled={isSubmitting}/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="type">نوع الحساب</Label>
                            <Select name="type" required disabled={isSubmitting}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر النوع" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="خزينة">خزينة</SelectItem>
                                    <SelectItem value="بنك">بنك</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="balance">الرصيد الافتتاحي</Label>
                            <Input id="balance" name="balance" type="number" placeholder="أدخل الرصيد" defaultValue="0" disabled={isSubmitting}/>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary" disabled={isSubmitting}>إلغاء</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                                حفظ
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
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
                    <TableHead>اسم الحساب</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead className="text-left">الرصيد الحالي</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {accounts.length > 0 ? accounts.map((account) => (
                    <TableRow key={account.id} className={cn(account.name.startsWith('صندوق مشروع:') && 'text-muted-foreground bg-muted/20')}>
                        <TableCell className="font-medium">
                            <Link href={`/reports/general-ledger?accountId=${encodeURIComponent(account.name)}`} className="hover:underline text-primary">
                                {account.name}
                            </Link>
                        </TableCell>
                        <TableCell>
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                {account.type === 'بنك' ? <Landmark className="h-3 w-3" /> : <Wallet className="h-3 w-3" />}
                                <span>{account.type}</span>
                            </Badge>
                        </TableCell>
                        <TableCell className={cn("text-left font-mono", account.balance >= 0 ? 'text-positive' : 'text-negative')}>
                         {account.balance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                        </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            لا توجد حسابات لعرضها. قم بإضافة حساب جديد للبدء.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
           </Table>
           </div>
           )}
      </div>
    </div>
  );
}
