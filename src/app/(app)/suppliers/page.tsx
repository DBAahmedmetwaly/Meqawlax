

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
import { PlusCircle, FileText, MoreVertical, HandCoins, LoaderCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { addSupplier, listenToSuppliers, makeSupplierPayment, type Supplier } from '@/services/suppliersService';
import { listenToTreasuryAccounts, type TreasuryAccount } from '@/services/treasuryService';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [dialogState, setDialogState] = useState({ open: false, type: '', supplierId: '' });
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    const unsubscribeSuppliers = listenToSuppliers((data) => {
      setSuppliers(data);
      setLoading(false);
    });
    const unsubscribeAccounts = listenToTreasuryAccounts(setAccounts);
    
    return () => {
      unsubscribeSuppliers();
      unsubscribeAccounts();
    };
  }, []);

  const handleAddSupplier = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const initialBalance = formData.get('initialBalance') as string;

    const newSupplier: Omit<Supplier, 'id'> = {
      name,
      balance: parseFloat(initialBalance) || 0,
    };
    
    try {
        await addSupplier(newSupplier);
        toast({ title: "نجاح", description: "تمت إضافة المورد بنجاح."});
        setDialogState({ open: false, type: '', supplierId: '' });
        form.reset();
    } catch (error) {
        toast({ title: "خطأ", description: "لم يتم إضافة المورد.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handlePayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const amount = parseFloat(formData.get('amount') as string);
    const accountId = formData.get('accountId') as string;
    const { supplierId } = dialogState;
    const supplier = suppliers.find(s => s.id === supplierId);

    if (!supplier || !accountId || !amount) {
        toast({ title: 'خطأ', description: 'البيانات غير مكتملة', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }
    
     const account = accounts.find(a => a.id === accountId);
     if (!account) {
        toast({ title: 'خطأ', description: 'حساب الصرف غير موجود', variant: 'destructive' });
        setIsSubmitting(false);
        return;
     }

    try {
        await makeSupplierPayment({
            supplierId,
            supplierName: supplier.name,
            amount,
            accountId,
            accountName: account.name,
        });
        toast({ title: "نجاح", description: "تم تسديد الدفعة بنجاح." });
        setDialogState({ open: false, type: '', supplierId: '' });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "فشلت عملية السداد.";
        toast({ title: 'خطأ', description: errorMessage, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const openDialog = (type: string, supplierId = '') => {
    setDialogState({ open: true, type, supplierId });
  };
  
  const getDialogContent = () => {
    const { type, supplierId } = dialogState;
    const supplier = suppliers.find(s => s.id === supplierId);

    switch(type) {
        case 'addSupplier':
            return (
                <>
                <DialogHeader><DialogTitle>إضافة مورد جديد</DialogTitle></DialogHeader>
                <form onSubmit={handleAddSupplier} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">اسم المورد</Label>
                    <Input id="name" name="name" placeholder="أدخل اسم المورد" required disabled={isSubmitting}/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="initialBalance">الرصيد الافتتاحي</Label>
                    <Input
                      id="initialBalance"
                      name="initialBalance"
                      type="number"
                      placeholder="أدخل الرصيد (موجب إذا كان المورد دائن)"
                      defaultValue="0"
                      disabled={isSubmitting}
                    />
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
        case 'makePayment':
             return (
                <>
                <DialogHeader><DialogTitle>تسديد دفعة للمورد: {supplier?.name}</DialogTitle></DialogHeader>
                 <form onSubmit={handlePayment} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">المبلغ المدفوع</Label>
                        <Input id="amount" name="amount" type="number" placeholder="أدخل المبلغ" required max={supplier?.balance} disabled={isSubmitting} />
                        <p className="text-xs text-muted-foreground">الرصيد المستحق الحالي: {supplier?.balance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="accountId">مصدر الصرف</Label>
                        <Select name="accountId" required disabled={isSubmitting}>
                            <SelectTrigger><SelectValue placeholder="اختر الخزينة أو البنك" /></SelectTrigger>
                            <SelectContent>
                                {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{`${acc.name} (${acc.balance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })})`}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmitting}>إلغاء</Button></DialogClose>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                        تسديد
                      </Button>
                    </DialogFooter>
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
          <h1 className="text-2xl font-semibold">قائمة الموردين</h1>
          <p className="text-muted-foreground">
            إدارة حسابات الموردين، الفواتير والدفعات.
          </p>
        </div>
        <Button onClick={() => openDialog('addSupplier')} className="w-full sm:w-auto">
            <PlusCircle className="ml-2 h-4 w-4" />
            إضافة مورد جديد
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
                <TableHead>اسم المورد</TableHead>
                <TableHead className="text-left">الرصيد</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.length > 0 ? suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">
                   {supplier.name}
                  </TableCell>
                  <TableCell
                     className={cn(
                        'text-left font-mono',
                        supplier.balance > 0 && 'text-negative',
                        supplier.balance < 0 && 'text-positive'
                     )}
                  >
                    {supplier.balance.toLocaleString('ar-EG', {
                      style: 'currency',
                      currency: 'EGP',
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        supplier.balance > 0 ? 'destructive' : supplier.balance < 0 ? 'secondary' : 'default'
                      }
                      className={supplier.balance === 0 ? 'bg-green-600 text-white' : ''}
                    >
                      {supplier.balance > 0 ? 'مستحق' : supplier.balance < 0 ? 'رصيد دائن' : 'مسدد'}
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
                        <DropdownMenuItem onClick={() => router.push(`/reports/supplier-statement?id=${supplier.id}`)}>
                          <FileText className="ml-2 h-4 w-4" />
                          <span>كشف حساب</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDialog('makePayment', supplier.id)} disabled={supplier.balance <= 0}>
                          <HandCoins className="ml-2 h-4 w-4" />
                          <span>تسديد دفعة</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        لا يوجد موردين لعرضهم. قم بإضافة مورد جديد للبدء.
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
