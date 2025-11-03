
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
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
import { PlusCircle, LoaderCircle, Edit, Trash2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { addBudgetItem, listenToBudgetItems, deleteBudgetItem, type BudgetItem, updateBudgetItem } from '@/services/budgetingService';

export default function BudgetingPage() {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const [dialogState, setDialogState] = useState<{ open: boolean, mode: 'add' | 'edit', item?: BudgetItem }>({ open: false, mode: 'add' });

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToBudgetItems((data) => {
      setItems(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSaveItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;

    if (!name) {
      toast({ title: 'خطأ', description: 'اسم البند مطلوب.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    try {
        if (dialogState.mode === 'add') {
            await addBudgetItem({ name });
            toast({ title: 'نجاح', description: 'تمت إضافة بند الموازنة بنجاح.' });
        } else if (dialogState.mode === 'edit' && dialogState.item) {
            await updateBudgetItem(dialogState.item.id, { name });
            toast({ title: 'نجاح', description: 'تم تعديل بند الموازنة بنجاح.' });
        }
        setDialogState({ open: false, mode: 'add' });
        form.reset();
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشلت عملية الحفظ.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if(window.confirm('هل أنت متأكد من حذف هذا البند؟ لا يمكن التراجع عن هذا الإجراء.')) {
        try {
            await deleteBudgetItem(itemId);
            toast({ title: 'نجاح', description: 'تم حذف البند بنجاح.' });
        } catch (error) {
            toast({ title: 'خطأ', description: 'فشل حذف البند.', variant: 'destructive' });
        }
    }
  }
  
  const openDialog = (mode: 'add' | 'edit', item?: BudgetItem) => {
    setDialogState({ open: true, mode, item });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-2xl font-semibold">مكتبة بنود الموازنات</h1>
            <p className="text-muted-foreground">إدارة البنود الرئيسية للموازنات التي يمكن استخدامها في كل المشاريع.</p>
        </div>
        <Button onClick={() => openDialog('add')}>
          <PlusCircle className="ml-2 h-4 w-4" />
          إضافة بند جديد
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة البنود</CardTitle>
          <CardDescription>هذه هي البنود التي يمكنك تخصيصها للمشاريع المختلفة. انقر على اسم البند لعرض تحليل تفصيلي.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80%]">اسم بند الموازنة</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length > 0 ? (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <Link href={`/budgeting/${item.id}`} className="hover:underline text-primary">
                            {item.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-center">
                            <Button variant="ghost" size="icon" onClick={() => openDialog('edit', item)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                             <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteItem(item.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="h-24 text-center">
                        لا توجد بنود موازنات معرفة. قم بإضافة بند جديد للبدء.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={dialogState.open} onOpenChange={(isOpen) => !isOpen && setDialogState({open: false, mode: 'add'})}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{dialogState.mode === 'add' ? 'إضافة بند موازنة جديد' : 'تعديل بند الموازنة'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveItem} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">اسم البند</Label>
                    <Input 
                        id="name" 
                        name="name" 
                        placeholder="مثال: أعمال الخرسانة المسلحة" 
                        required 
                        disabled={isSubmitting}
                        defaultValue={dialogState.item?.name}
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
        </DialogContent>
      </Dialog>

    </div>
  );
}
