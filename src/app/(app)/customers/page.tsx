
'use client';

import { useState, useEffect } from 'react';
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
import { PlusCircle, FileText, MoreVertical, DollarSign, LoaderCircle } from 'lucide-react';
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
import { addCustomer, listenToCustomers, type Customer } from '@/services/customersService';
import { listenToTreasuryAccounts, type TreasuryAccount } from '@/services/treasuryService';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [dialogState, setDialogState] = useState({ open: false, type: '', customerId: '' });
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
      setLoading(true);
      const unsubscribeCustomers = listenToCustomers((data) => {
          setCustomers(data);
          setLoading(false);
      });
      const unsubscribeAccounts = listenToTreasuryAccounts(setAccounts);

      return () => {
          unsubscribeCustomers();
          unsubscribeAccounts();
      }
  }, []);

  const handleAddCustomer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const initialBalance = formData.get('initialBalance') as string;

    const newCustomer: Omit<Customer, 'id'> = {
      name,
      balance: parseFloat(initialBalance) || 0,
      status: (parseFloat(initialBalance) || 0) > 0 ? 'مستحق' : 'مسدد',
    };
    
    try {
        await addCustomer(newCustomer);
        toast({ title: "نجاح", description: "تمت إضافة العميل بنجاح."});
        setDialogState({ open: false, type: '', customerId: '' });
        form.reset();
    } catch (error) {
        toast({ title: "خطأ", description: "لم يتم إضافة العميل.", variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handlePayment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const amount = parseFloat(formData.get('amount') as string);
    const accountId = formData.get('accountId') as string;
    const { customerId } = dialogState;
    
    // This is a placeholder for the actual payment logic
    console.log({ customerId, amount, accountId });

    toast({ title: "نجاح (مؤقت)", description: "تم استلام الدفعة بنجاح." });
    setDialogState({ open: false, type: '', customerId: '' });
    setIsSubmitting(false);
  };
  
  const openDialog = (type: string, customerId = '') => {
    setDialogState({ open: true, type, customerId });
  };

  const getDialogContent = () => {
    const { type, customerId } = dialogState;
    const customer = customers.find(c => c.id === customerId);

    switch(type) {
        case 'addCustomer':
            return (
                <>
                <DialogHeader><DialogTitle>إضافة عميل جديد</DialogTitle></DialogHeader>
                <form onSubmit={handleAddCustomer} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">اسم العميل</Label>
                    <Input id="name" name="name" placeholder="أدخل اسم العميل" required disabled={isSubmitting}/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="initialBalance">الرصيد الافتتاحي</Label>
                    <Input
                      id="initialBalance"
                      name="initialBalance"
                      type="number"
                      placeholder="أدخل الرصيد الافتتاحي"
                      defaultValue="0"
                      disabled={isSubmitting}
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmitting}>إلغاء</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <LoaderCircle className="ml-2 h-4 w-4 animate-spin"/>}
                        حفظ
                    </Button>
                  </DialogFooter>
                </form>
                </>
            );
        case 'collectPayment':
             return (
                <>
                <DialogHeader><DialogTitle>تحصيل دفعة من العميل: {customer?.name}</DialogTitle></DialogHeader>
                 <form onSubmit={handlePayment} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">المبلغ المحصّل</Label>
                        <Input id="amount" name="amount" type="number" placeholder="أدخل المبلغ" required max={customer?.balance} disabled={isSubmitting} />
                        <p className="text-xs text-muted-foreground">الرصيد المستحق الحالي: {customer?.balance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="accountId">إيداع في حساب</Label>
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
                        {isSubmitting && <LoaderCircle className="ml-2 h-4 w-4 animate-spin"/>}
                        تحصيل
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
          <h1 className="text-2xl font-semibold">قائمة العملاء</h1>
          <p className="text-muted-foreground">
            إدارة حسابات العملاء والفواتير والتحصيلات.
          </p>
        </div>
        <Button onClick={() => openDialog('addCustomer')} className="w-full sm:w-auto">
            <PlusCircle className="ml-2 h-4 w-4" />
            إضافة عميل جديد
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
                    <TableHead className="w-[40%]">اسم العميل</TableHead>
                    <TableHead className="text-left">الرصيد المستحق</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.length > 0 ? customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        {customer.name}
                      </TableCell>
                      <TableCell className="text-left font-mono text-negative">
                        {customer.balance.toLocaleString('ar-EG', {
                          style: 'currency',
                          currency: 'EGP',
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            customer.status === 'متأخر'
                              ? 'destructive'
                              : customer.balance <= 0
                              ? 'default'
                              : 'secondary'
                          }
                          className={customer.balance <= 0 ? 'bg-green-600 text-white' : ''}
                        >
                          {customer.balance <= 0 ? 'مسدد' : customer.status}
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
                            <DropdownMenuItem>
                              <FileText className="ml-2 h-4 w-4" />
                              <span>كشف حساب</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDialog('collectPayment', customer.id)} disabled={customer.balance <= 0}>
                              <DollarSign className="ml-2 h-4 w-4" />
                              <span>تحصيل دفعة</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                     <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            لا يوجد عملاء لعرضهم. قم بإضافة عميل جديد للبدء.
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
