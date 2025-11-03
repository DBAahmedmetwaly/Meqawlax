
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
import { PlusCircle, LoaderCircle } from 'lucide-react';
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
import { addItem, listenToItems, type Item, type Unit } from '@/services/inventoryService';
import { cn } from '@/lib/utils';

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const units: Unit[] = ['قطعة', 'كيلو', 'متر', 'لتر', 'كرتون', 'حبة', 'كيس', 'طن'];

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToItems((itemsData) => {
      setItems(itemsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const unit = formData.get('unit') as Unit;
    const cost = parseFloat(formData.get('cost') as string);
    const initialStock = parseFloat(formData.get('initialStock') as string);

    if (!name || !unit) {
      toast({ title: 'خطأ', description: 'الرجاء تعبئة جميع الحقول.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    const newItem: Omit<Item, 'id'> = {
      name,
      unit,
      stock: initialStock || 0,
      cost: cost || 0,
    };
    
    try {
        await addItem(newItem);
        toast({ title: 'نجاح', description: `تمت إضافة الصنف "${name}" بنجاح.` });
        setOpen(false);
        form.reset();
    } catch (error) {
        toast({ title: 'خطأ', description: 'لم يتم إضافة الصنف.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const getUnitBadge = (unit: Unit) => {
    const colors: {[key in Unit]?: string} = {
        'قطعة': 'bg-blue-100 text-blue-800',
        'كيلو': 'bg-purple-100 text-purple-800',
        'متر': 'bg-yellow-100 text-yellow-800',
        'لتر': 'bg-green-100 text-green-800',
        'كرتون': 'bg-indigo-100 text-indigo-800',
        'حبة': 'bg-pink-100 text-pink-800',
        'كيس': 'bg-gray-100 text-gray-800',
        'طن': 'bg-orange-100 text-orange-800',
    }
    return <Badge variant="secondary" className={cn('whitespace-nowrap', colors[unit])}>{unit}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">قائمة الأصناف</h1>
          <p className="text-muted-foreground">إدارة جميع الأصناف التي يتم شراؤها وأرصدتها في المخزون.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <PlusCircle className="ml-2 h-4 w-4" />
              إضافة صنف جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة صنف جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم الصنف</Label>
                <Input id="name" name="name" placeholder="مثال: أسمنت مقاوم" required disabled={isSubmitting} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="unit">وحدة القياس</Label>
                    <Select name="unit" required disabled={isSubmitting}>
                    <SelectTrigger>
                        <SelectValue placeholder="اختر وحدة" />
                    </SelectTrigger>
                    <SelectContent>
                        {units.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                            {unit}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="cost">متوسط التكلفة</Label>
                    <Input id="cost" name="cost" type="number" placeholder="أدخل التكلفة" defaultValue="0" disabled={isSubmitting} />
                </div>
              </div>
               <div className="space-y-2">
                <Label htmlFor="initialStock">الرصيد الافتتاحي</Label>
                <Input id="initialStock" name="initialStock" type="number" placeholder="أدخل الكمية المبدئية" defaultValue="0" disabled={isSubmitting} />
                <p className="text-xs text-muted-foreground">هذه الكمية هي رصيد أول المدة للصنف.</p>
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
                  <TableHead>اسم الصنف</TableHead>
                  <TableHead>وحدة القياس</TableHead>
                  <TableHead className="text-left">متوسط التكلفة</TableHead>
                  <TableHead className="text-left">الكمية المتوفرة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length > 0 ? (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{getUnitBadge(item.unit)}</TableCell>
                       <TableCell className="text-left font-mono">
                        {item.cost.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                      </TableCell>
                      <TableCell className="text-left font-mono">{item.stock.toLocaleString('ar-EG')}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      لا توجد أصناف لعرضها. قم بإضافة صنف جديد للبدء.
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
