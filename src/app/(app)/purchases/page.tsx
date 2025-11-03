

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, LoaderCircle, Trash2, Calendar as CalendarIcon, X, ShoppingCart, ChevronDown, ChevronUp, WalletCards } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Combobox } from '@/components/ui/combobox';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { listenToItems, type Item, addItem as addInventoryItem, type Unit } from '@/services/inventoryService';
import { listenToSuppliers, type Supplier, addSupplier } from '@/services/suppliersService';
import { addPurchaseInvoice, listenToPurchaseInvoices, type PurchaseInvoice, type PurchaseInvoiceItem } from '@/services/purchasesService';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { listenToProjects, type Project } from '@/services/projectsService';
import { Badge } from '@/components/ui/badge';
import { listenToTreasuryAccounts, type TreasuryAccount } from '@/services/treasuryService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


interface InvoiceItem extends PurchaseInvoiceItem {
  itemName: string;
}

export default function PurchasesPage() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Main Dialog State
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Quick Add Dialog States
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [isSubmittingSupplier, setIsSubmittingSupplier] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  
  const { toast } = useToast();

  const [date, setDate] = useState<Date>(new Date());
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [currentItem, setCurrentItem] = useState({ itemId: '', quantity: '', price: '' });
  const [paidAmount, setPaidAmount] = useState(0);
  
  const [purchaseType, setPurchaseType] = useState<'inventory' | 'project'>('inventory');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedBudgetItemId, setSelectedBudgetItemId] = useState<string>('');
  
  const [filters, setFilters] = useState({
      supplierId: 'all',
      itemId: 'all',
      startDate: undefined as Date | undefined,
      endDate: undefined as Date | undefined,
  });

  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  
  const units: Unit[] = ['قطعة', 'كيلو', 'متر', 'لتر', 'كرتون', 'حبة', 'كيس', 'طن'];

  useEffect(() => {
    const unsubscribeInvoices = listenToPurchaseInvoices(setInvoices);
    const unsubscribeItems = listenToItems(setItems);
    const unsubscribeSuppliers = listenToSuppliers(setSuppliers);
    const unsubscribeProjects = listenToProjects(setProjects);
    const unsubscribeAccounts = listenToTreasuryAccounts(setAccounts);

    const unsubscribeLoading = listenToItems((data) => {
        if(data) setLoading(false);
    });

    return () => {
        unsubscribeInvoices();
        unsubscribeItems();
        unsubscribeSuppliers();
        unsubscribeProjects();
        unsubscribeAccounts();
        unsubscribeLoading();
    };
  }, []);
  
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
        const invoiceDate = parseISO(invoice.date);
        const isAfterStartDate = !filters.startDate || invoiceDate >= filters.startDate;
        const isBeforeEndDate = !filters.endDate || invoiceDate <= filters.endDate;
        const matchesSupplier = filters.supplierId === 'all' || invoice.supplierId === filters.supplierId;
        const matchesItem = filters.itemId === 'all' || invoice.items.some(item => item.itemId === filters.itemId);

        return isAfterStartDate && isBeforeEndDate && matchesSupplier && matchesItem;
    });
  }, [invoices, filters]);
  
  const resetFilters = () => {
    setFilters({
        supplierId: 'all',
        itemId: 'all',
        startDate: undefined,
        endDate: undefined,
    });
  };
  
  const resetForm = () => {
    setInvoiceItems([]);
    setCurrentItem({ itemId: '', quantity: '', price: '' });
    setDate(new Date());
    setPurchaseType('inventory');
    setSelectedProjectId('');
    setSelectedBudgetItemId('');
    setPaidAmount(0);
  }

  const handleAddItemToInvoice = () => {
    const selectedItem = items.find(i => i.id === currentItem.itemId);
    if (!selectedItem || !currentItem.quantity || !currentItem.price) {
        toast({ title: 'خطأ', description: 'الرجاء تعبئة جميع حقول الصنف.', variant: 'destructive'});
        return;
    }
    
    const quantity = parseFloat(currentItem.quantity);
    const price = parseFloat(currentItem.price);

    setInvoiceItems([...invoiceItems, {
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        quantity,
        price,
        total: quantity * price,
    }]);

    setCurrentItem({ itemId: '', quantity: '', price: '' });
  };

  const handleRemoveItemFromInvoice = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const totalInvoiceAmount = useMemo(() => {
    return invoiceItems.reduce((sum, item) => sum + item.total, 0);
  }, [invoiceItems]);

  const remainingAmount = useMemo(() => {
      return totalInvoiceAmount - paidAmount;
  }, [totalInvoiceAmount, paidAmount]);

  const selectedProjectForForm = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);
  
  const projectFund = useMemo(() => {
    if (purchaseType !== 'project' || !selectedProjectForForm?.treasuryAccountId) return null;
    return accounts.find(acc => acc.id === selectedProjectForForm.treasuryAccountId);
  }, [accounts, selectedProjectForForm, purchaseType]);

  const generalAccounts = useMemo(() => {
    return accounts.filter(acc => !acc.name.startsWith('صندوق مشروع:'));
  }, [accounts]);

  const handleAddInvoice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (invoiceItems.length === 0) {
        toast({ title: 'خطأ', description: 'يجب أن تحتوي الفاتورة على صنف واحد على الأقل.', variant: 'destructive' });
        return;
    }
    setIsSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const supplierId = formData.get('supplierId') as string;
    const supplierInvoiceNumber = formData.get('supplierInvoiceNumber') as string | undefined;
    let paymentAccountId: string | undefined = undefined;

    const selectedSupplier = suppliers.find(s => s.id === supplierId);
    
    if (purchaseType === 'project') {
        if (!projectFund) {
            toast({ title: 'خطأ', description: 'صندوق المشروع المحدد غير موجود.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }
        paymentAccountId = projectFund.id;
        if (paidAmount > projectFund.balance) {
            toast({ title: 'خطأ', description: 'رصيد صندوق المشروع غير كافٍ.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }
    } else { // inventory purchase
        paymentAccountId = formData.get('paymentAccountId') as string;
        if (paidAmount > 0 && !paymentAccountId) {
            toast({ title: 'خطأ', description: 'الرجاء تحديد مصدر الصرف للمبلغ المدفوع.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }
        const paymentAccount = generalAccounts.find(acc => acc.id === paymentAccountId);
        if (paymentAccount && paidAmount > paymentAccount.balance) {
            toast({ title: 'خطأ', description: 'رصيد حساب الصرف غير كافٍ.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }
    }
    
    const newInvoice: Omit<PurchaseInvoice, 'id' | 'invoiceNumber'> = {
        supplierId,
        supplierName: selectedSupplier?.name,
        date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        items: invoiceItems.map(({ itemName, ...rest}) => rest),
        totalAmount: totalInvoiceAmount,
        paidAmount,
        remainingAmount,
        purchaseType: purchaseType,
    };
    if (paymentAccountId) {
        newInvoice.paymentAccountId = paymentAccountId;
    }
     if (purchaseType === 'project') {
        newInvoice.projectId = selectedProjectId;
        newInvoice.budgetItemId = selectedBudgetItemId;
    }

    if (supplierInvoiceNumber) {
        newInvoice.supplierInvoiceNumber = supplierInvoiceNumber;
    }

    try {
        await addPurchaseInvoice(newInvoice);
        toast({ title: 'نجاح', description: 'تمت إضافة فاتورة الشراء بنجاح.'});
        setOpen(false);
        form.reset();
        resetForm();
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "لم يتم إضافة فاتورة الشراء.";
        toast({ title: 'خطأ', description: errorMessage, variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleAddQuickSupplier = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmittingSupplier(true);
    const form = event.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    if (!name) {
        toast({title: "خطأ", description: "اسم المورد مطلوب.", variant: "destructive"});
        setIsSubmittingSupplier(false);
        return;
    }
    try {
        await addSupplier({name, balance: 0});
        toast({title: "نجاح", description: `تمت إضافة المورد "${name}" بنجاح.`});
        setAddSupplierOpen(false);
        form.reset();
    } catch (error) {
        toast({title: "خطأ", description: "فشلت إضافة المورد.", variant: "destructive"});
    } finally {
        setIsSubmittingSupplier(false);
    }
  };

  const handleAddQuickItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmittingItem(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const unit = formData.get('unit') as Unit;

    if (!name || !unit) {
      toast({ title: 'خطأ', description: 'الرجاء تعبئة جميع الحقول.', variant: 'destructive' });
      setIsSubmittingItem(false);
      return;
    }
    
    try {
        await addInventoryItem({ name, unit, stock: 0, cost: 0 });
        toast({ title: 'نجاح', description: `تمت إضافة الصنف "${name}" بنجاح.` });
        setAddItemOpen(false);
        form.reset();
    } catch (error) {
        toast({ title: 'خطأ', description: 'لم يتم إضافة الصنف.', variant: 'destructive' });
    } finally {
        setIsSubmittingItem(false);
    }
  };
  
  const getSupplierName = (supplierId: string) => suppliers.find(s => s.id === supplierId)?.name || 'غير معروف';
  const getItemName = (itemId: string) => items.find(i => i.id === itemId)?.name || 'صنف محذوف';
  const getProjectName = (projectId?: string) => projectId ? projects.find(p => p.id === projectId)?.name : 'N/A';
  const getBudgetItemName = (invoice: PurchaseInvoice) => {
    if (!invoice.projectId || !invoice.budgetItemId) return '-';
    const project = projects.find(p => p.id === invoice.projectId);
    return project?.budgetItems?.[invoice.budgetItemId]?.name || 'بند محذوف';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">سجل فواتير الشراء</h1>
          <p className="text-muted-foreground">عرض وتصفية جميع فواتير الشراء المسجلة في النظام.</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <PlusCircle className="ml-2 h-4 w-4" />
              إضافة فاتورة شراء
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>إضافة فاتورة شراء جديدة</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddInvoice} className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
                    <div className="space-y-2 md:col-span-2">
                        <Label>وجهة الشراء</Label>
                        <RadioGroup value={purchaseType} onValueChange={(val: 'inventory' | 'project') => setPurchaseType(val)} className="flex gap-4">
                            <div className="flex items-center space-x-2 space-x-reverse"><RadioGroupItem value="inventory" id="r1" /><Label htmlFor="r1">شراء للمخزن</Label></div>
                            <div className="flex items-center space-x-2 space-x-reverse"><RadioGroupItem value="project" id="r2" /><Label htmlFor="r2">شراء مباشر لمشروع</Label></div>
                        </RadioGroup>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="supplierId">المورد</Label>
                         <div className="flex gap-2 items-center">
                            <Select name="supplierId" required disabled={isSubmitting}>
                                <SelectTrigger><SelectValue placeholder="اختر المورد" /></SelectTrigger>
                                <SelectContent>
                                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Dialog open={addSupplierOpen} onOpenChange={setAddSupplierOpen}>
                               <DialogTrigger asChild><Button type="button" variant="outline" size="icon"><PlusCircle/></Button></DialogTrigger>
                               <DialogContent><DialogHeader><DialogTitle>إضافة مورد جديد</DialogTitle></DialogHeader>
                                <form onSubmit={handleAddQuickSupplier} className="space-y-4">
                                    <div className="space-y-2"><Label htmlFor="name">اسم المورد</Label><Input id="name" name="name" required disabled={isSubmittingSupplier}/></div>
                                    <DialogFooter>
                                        <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmittingSupplier}>إلغاء</Button></DialogClose>
                                        <Button type="submit" disabled={isSubmittingSupplier}>{isSubmittingSupplier && <LoaderCircle className="ml-2 h-4 w-4 animate-spin"/>} إضافة</Button>
                                    </DialogFooter>
                                </form>
                               </DialogContent>
                            </Dialog>
                         </div>
                    </div>
                     <div className="space-y-2">
                        <Label>تاريخ الفاتورة</Label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} disabled={isSubmitting} className={cn( "w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                            <CalendarIcon className="ml-2 h-4 w-4" />{date ? format(date, "PPP") : <span>اختر تاريخ</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="supplierInvoiceNumber">رقم فاتورة المورد (اختياري)</Label>
                        <Input id="supplierInvoiceNumber" name="supplierInvoiceNumber" placeholder="مثال: INV-12345" disabled={isSubmitting} />
                    </div>

                    {purchaseType === 'project' && (
                        <>
                         <div className="space-y-2">
                            <Label>المشروع</Label>
                            <Select name="projectId" required={purchaseType === 'project'} onValueChange={setSelectedProjectId} disabled={isSubmitting}>
                                <SelectTrigger><SelectValue placeholder="اختر المشروع" /></SelectTrigger>
                                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>تحميل على بند الموازنة</Label>
                            <Select name="budgetItemId" required={purchaseType === 'project'} onValueChange={setSelectedBudgetItemId} disabled={isSubmitting || !selectedProjectForForm}>
                                <SelectTrigger><SelectValue placeholder="اختر بند الموازنة" /></SelectTrigger>
                                <SelectContent>
                                    {selectedProjectForForm?.budgetItems && Object.entries(selectedProjectForForm.budgetItems).map(([id, item]) => (
                                        <SelectItem key={id} value={id}>{item.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        </>
                    )}
                </div>

                <Card>
                    <CardHeader><CardTitle className="text-lg">أصناف الفاتورة</CardTitle></CardHeader>
                    <CardContent>
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
                            <div className="space-y-1">
                                <Label>الصنف</Label>
                                <div className="flex gap-2">
                                <Combobox
                                    placeholder="ابحث عن صنف..."
                                    notFoundText="لم يتم العثور على الصنف."
                                    options={items.map(i => ({ value: i.id, label: `${i.name} (${i.unit})` }))}
                                    onSelect={(value) => setCurrentItem({...currentItem, itemId: value })}
                                    value={currentItem.itemId}
                                />
                                <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
                                    <DialogTrigger asChild><Button type="button" variant="outline" size="icon"><PlusCircle/></Button></DialogTrigger>
                                    <DialogContent><DialogHeader><DialogTitle>إضافة صنف جديد</DialogTitle></DialogHeader>
                                    <form onSubmit={handleAddQuickItem} className="space-y-4">
                                        <div className="space-y-2"><Label htmlFor="name">اسم الصنف</Label><Input id="name" name="name" required disabled={isSubmittingItem}/></div>
                                        <div className="space-y-2"><Label htmlFor="unit">وحدة القياس</Label>
                                            <Select name="unit" required disabled={isSubmittingItem}><SelectTrigger><SelectValue placeholder="اختر وحدة" /></SelectTrigger>
                                                <SelectContent>{units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <DialogFooter>
                                            <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmittingItem}>إلغاء</Button></DialogClose>
                                            <Button type="submit" disabled={isSubmittingItem}>{isSubmittingItem && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />} إضافة</Button>
                                        </DialogFooter>
                                    </form>
                                    </DialogContent>
                                </Dialog>
                                </div>
                            </div>
                             <div className="space-y-1">
                                <Label>الكمية</Label>
                                <Input className="w-24" type="number" placeholder="0" value={currentItem.quantity} onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value })}/>
                            </div>
                             <div className="space-y-1">
                                <Label>السعر</Label>
                                <Input className="w-28" type="number" placeholder="0.00" value={currentItem.price} onChange={(e) => setCurrentItem({...currentItem, price: e.target.value })}/>
                            </div>
                            <Button type="button" onClick={handleAddItemToInvoice} className="self-end"><PlusCircle className="ml-2"/> إضافة</Button>
                        </div>

                        <div className="overflow-x-auto mt-4 rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50%]">الصنف</TableHead>
                                        <TableHead>الكمية</TableHead>
                                        <TableHead>السعر</TableHead>
                                        <TableHead>الإجمالي</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoiceItems.length > 0 ? invoiceItems.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{item.itemName}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>{item.price.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP'})}</TableCell>
                                            <TableCell>{item.total.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP'})}</TableCell>
                                            <TableCell>
                                                <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemoveItemFromInvoice(index)}>
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground mb-2"/>
                                                لم تتم إضافة أصناف بعد.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader><CardTitle className="text-lg">تفاصيل السداد</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="paidAmount">المبلغ المدفوع</Label>
                            <Input id="paidAmount" name="paidAmount" type="number" placeholder="0.00" value={paidAmount || ''} onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)} disabled={isSubmitting}/>
                        </div>
                        {purchaseType === 'inventory' ? (
                            <div className="space-y-2">
                                <Label htmlFor="paymentAccountId">مصدر الصرف (الخزينة/البنك)</Label>
                                <Select name="paymentAccountId" disabled={isSubmitting || paidAmount <= 0}>
                                    <SelectTrigger><SelectValue placeholder="اختر حساب الصرف" /></SelectTrigger>
                                    <SelectContent>{generalAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{`${acc.name} (${acc.balance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })})`}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        ) : projectFund && (
                             <Alert>
                                <WalletCards className="h-4 w-4" />
                                <AlertTitle>مصدر الصرف: {projectFund.name}</AlertTitle>
                                <AlertDescription>
                                    الرصيد الحالي: {projectFund.balance.toLocaleString('ar-EG', {style: 'currency', currency: 'EGP'})}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col items-end gap-2 font-bold text-lg bg-muted/50 p-4 rounded-b-md">
                        <div className="flex justify-between w-full"><span>إجمالي الفاتورة:</span> <span>{totalInvoiceAmount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP'})}</span></div>
                        <div className="flex justify-between w-full text-destructive"><span>المبلغ المتبقي:</span> <span>{remainingAmount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP'})}</span></div>
                    </CardFooter>
                 </Card>

              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmitting}>إلغاء</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting || invoiceItems.length === 0}>
                  {isSubmitting && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                  حفظ الفاتورة
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

       <div className="border rounded-lg overflow-hidden">
             <Card className="mb-6 bg-muted/50 border-none rounded-none">
                <CardHeader><CardTitle className="text-lg">خيارات التصفية</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className="space-y-2">
                        <Label>المورد</Label>
                        <Select value={filters.supplierId} onValueChange={(value) => setFilters(prev => ({...prev, supplierId: value}))}>
                            <SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">الكل</SelectItem>
                                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>الصنف</Label>
                        <Select value={filters.itemId} onValueChange={(value) => setFilters(prev => ({...prev, itemId: value}))}>
                            <SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">الكل</SelectItem>
                                {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                         <Label>من تاريخ</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn( "w-full justify-start text-left font-normal bg-card", !filters.startDate && "text-muted-foreground")}>
                                <CalendarIcon className="ml-2 h-4 w-4" />
                                {filters.startDate ? format(filters.startDate, "PPP") : <span>اختر تاريخ</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filters.startDate} onSelect={(date) => setFilters(prev => ({...prev, startDate: date || undefined}))} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                         <Label>إلى تاريخ</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn( "w-full justify-start text-left font-normal bg-card", !filters.endDate && "text-muted-foreground")}>
                                <CalendarIcon className="ml-2 h-4 w-4" />
                                {filters.endDate ? format(filters.endDate, "PPP") : <span>اختر تاريخ</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filters.endDate} onSelect={(date) => setFilters(prev => ({...prev, endDate: date || undefined}))} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
                 <CardFooter>
                    <Button onClick={resetFilters} variant="ghost" size="sm">
                        <X className="ml-2 h-4 w-4" />
                        إعادة تعيين الفلاتر
                    </Button>
                </CardFooter>
            </Card>

            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="overflow-x-auto">
                   <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>رقم الفاتورة</TableHead>
                        <TableHead>المورد</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الوجهة</TableHead>
                        <TableHead>المسجل</TableHead>
                        <TableHead className="text-left">الإجمالي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredInvoices.map((invoice) => (
                           <React.Fragment key={invoice.id}>
                                <tr onClick={() => setExpandedInvoice(prev => prev === invoice.id ? null : invoice.id)} className="cursor-pointer border-b">
                                  <TableCell>
                                    <ChevronDown className={cn("h-4 w-4 transition-transform", expandedInvoice === invoice.id && "rotate-180")} />
                                  </TableCell>
                                  <TableCell className="font-medium py-4 align-middle">
                                    <Badge variant="secondary">{invoice.invoiceNumber}</Badge>
                                  </TableCell>
                                  <TableCell className="py-4 align-middle">{getSupplierName(invoice.supplierId)}</TableCell>
                                  <TableCell className="py-4 align-middle">{invoice.date}</TableCell>
                                  <TableCell className="py-4 align-middle">
                                    {invoice.purchaseType === 'project' ? 
                                      <span className="font-semibold text-blue-600">مشروع: {getProjectName(invoice.projectId)}</span> 
                                      : <span className="text-muted-foreground">المخزن</span>}
                                  </TableCell>
                                  <TableCell className="py-4 align-middle"><Badge variant="outline">{invoice.createdByName}</Badge></TableCell>
                                  <TableCell className="text-left font-mono py-4 align-middle">{invoice.totalAmount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP'})}</TableCell>
                                </tr>
                                 {expandedInvoice === invoice.id && (
                                    <tr className="bg-muted/50">
                                    <TableCell colSpan={7} className="p-0">
                                      <div className="p-4">
                                        <div className="flex justify-between items-center mb-2">
                                          <div className="space-x-4">
                                            <h4 className="font-semibold inline">تفاصيل الفاتورة:</h4>
                                            {invoice.supplierInvoiceNumber && <Badge variant="outline">رقم فاتورة المورد: {invoice.supplierInvoiceNumber}</Badge>}
                                          </div>
                                          {invoice.purchaseType === 'project' && <span className="text-xs text-muted-foreground">تم التحميل على بند: {getBudgetItemName(invoice)}</span>}
                                        </div>
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>الصنف</TableHead>
                                              <TableHead className="text-center">الكمية</TableHead>
                                              <TableHead className="text-center">سعر الوحدة</TableHead>
                                              <TableHead className="text-left">الإجمالي</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {invoice.items.map((item, index) => (
                                              <TableRow key={index} className="bg-background">
                                                <TableCell>{getItemName(item.itemId)}</TableCell>
                                                <TableCell className="text-center">{item.quantity}</TableCell>
                                                <TableCell className="text-center font-mono">{item.price.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP'})}</TableCell>
                                                <TableCell className="text-left font-mono">{item.total.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP'})}</TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </TableCell>
                                  </tr>
                                )}
                          </React.Fragment>
                        ))}
                        {filteredInvoices.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                لا توجد فواتير شراء تطابق معايير البحث.
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
