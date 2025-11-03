
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
import { PlusCircle, LoaderCircle, Trash2 } from 'lucide-react';
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
import { addExpenseType, listenToExpenseTypes, deleteExpenseType, type ExpenseType } from '@/services/expensesService';

export default function ExpenseTypesPage() {
  const [items, setItems] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToExpenseTypes((data) => {
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
      toast({ title: 'خطأ', description: 'اسم النوع مطلوب.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    try {
        await addExpenseType({ name });
        toast({ title: 'نجاح', description: 'تمت إضافة نوع المصروف بنجاح.' });
        setIsDialogOpen(false);
        form.reset();
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشلت عملية الحفظ.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if(window.confirm('هل أنت متأكد من حذف هذا النوع؟')) {
        try {
            await deleteExpenseType(itemId);
            toast({ title: 'نجاح', description: 'تم حذف نوع المصروف بنجاح.' });
        } catch (error) {
            toast({ title: 'خطأ', description: 'فشل حذف النوع.', variant: 'destructive' });
        }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-2xl font-semibold">مكتبة أنواع المصروفات</h1>
            <p className="text-muted-foreground">إدارة الأنواع المختلفة للمصروفات التي يمكن تحميلها على بنود الموازنات.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="ml-2 h-4 w-4" />
              إضافة نوع جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
                <DialogTitle>إضافة نوع مصروف جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveItem} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">اسم النوع</Label>
                    <Input 
                        id="name" 
                        name="name" 
                        placeholder="مثال: أجور عمال, إيجار معدات" 
                        required 
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
        </DialogContent>
      </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الأنواع</CardTitle>
          <CardDescription>هذه هي أنواع المصروفات التي يمكنك استخدامها عند تسجيل المصروفات النقدية. انقر على اسم النوع لعرض تحليل تفصيلي.</CardDescription>
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
                    <TableHead className="w-[80%]">اسم النوع</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length > 0 ? (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                           <Link href={`/expense-types/${item.id}`} className="hover:underline text-primary">
                            {item.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-center">
                             <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteItem(item.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="h-24 text-center">
                        لا توجد أنواع مصروفات معرفة. قم بإضافة نوع جديد للبدء.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
