
'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoaderCircle, PackageSearch, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { listenToExpenses, type Expense } from '@/services/expensesService';
import { listenToProjects, type Project } from '@/services/projectsService';
import { Badge } from '@/components/ui/badge';
import { listenToPurchaseInvoices, PurchaseInvoice } from '@/services/purchasesService';
import { listenToItems, Item } from '@/services/inventoryService';

interface Movement {
    id: string;
    date: string;
    type: 'purchase' | 'withdrawal';
    referenceNumber: string;
    projectName?: string;
    itemName: string;
    quantity: number;
    unit: string;
    cost: number;
}

export default function InventoryMovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeData = async () => {
      const projectsPromise = new Promise<Project[]>(resolve => listenToProjects(resolve));
      const itemsPromise = new Promise<Item[]>(resolve => listenToItems(resolve));
      const [projectsData, itemsData] = await Promise.all([projectsPromise, itemsPromise]);
      setProjects(projectsData);
      setItems(itemsData);
      setLoading(false);

      const unsubPurchases = listenToPurchaseInvoices((invoices) => {
          const purchaseMovements = invoices.filter(inv => inv.purchaseType === 'inventory').flatMap(inv => 
              inv.items.map(item => ({
                  id: `${inv.id}-${item.itemId}`,
                  date: inv.date,
                  type: 'purchase' as const,
                  referenceNumber: inv.invoiceNumber,
                  itemName: itemsData.find(i => i.id === item.itemId)?.name || 'غير معروف',
                  quantity: item.quantity,
                  unit: itemsData.find(i => i.id === item.itemId)?.unit || '',
                  cost: item.total,
              }))
          );
          setMovements(prev => [...prev.filter(p => p.type !== 'purchase'), ...purchaseMovements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      });

      const unsubExpenses = listenToExpenses((allExpenses) => {
          const withdrawalMovements = allExpenses.filter(exp => exp.type.startsWith('صرف مخزون:')).map(exp => {
              const typeMatch = exp.type.match(/صرف مخزون: (.*)/);
              const itemName = typeMatch ? typeMatch[1] : 'غير معروف';
              
              const descMatch = exp.description?.match(/صرف كمية \(([\d.]+) (.*?)\)/);
              const quantity = descMatch ? parseFloat(descMatch[1]) : 0;
              const unit = descMatch ? descMatch[2] : '';
              
              return {
                  id: exp.id,
                  date: exp.date,
                  type: 'withdrawal' as const,
                  referenceNumber: exp.referenceNumber || exp.id,
                  projectName: projectsData.find(p => p.id === exp.projectId)?.name || 'غير محدد',
                  itemName,
                  quantity,
                  unit,
                  cost: exp.amount,
              };
          });
          setMovements(prev => [...prev.filter(p => p.type !== 'withdrawal'), ...withdrawalMovements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      });

      return () => {
          unsubPurchases();
          unsubExpenses();
      };
    };

    const cleanupPromise = initializeData();
    
    return () => {
      cleanupPromise.then(cleanup => cleanup && cleanup());
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">سجل حركة المخزون (الوارد والصادر)</h1>
        <p className="text-muted-foreground">
          عرض سجل بجميع الأصناف التي تم شراؤها للمخزون أو صرفها منه إلى المشاريع.
        </p>
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
                  <TableHead>التاريخ</TableHead>
                  <TableHead>نوع الحركة</TableHead>
                  <TableHead>رقم المرجع</TableHead>
                  <TableHead>الجهة</TableHead>
                  <TableHead>الصنف</TableHead>
                  <TableHead className="text-center">الكمية</TableHead>
                  <TableHead className="text-left">التكلفة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length > 0 ? (
                  movements.map((movement) => {
                      return (
                         <TableRow key={movement.id}>
                          <TableCell>{movement.date}</TableCell>
                          <TableCell>
                            {movement.type === 'purchase' ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                    <ArrowDownToLine className="h-3 w-3 ml-1"/> وارد (شراء)
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                    <ArrowUpFromLine className="h-3 w-3 ml-1"/> صادر (صرف)
                                </Badge>
                            )}
                          </TableCell>
                          <TableCell><Badge variant="outline">{movement.referenceNumber}</Badge></TableCell>
                          <TableCell className="font-medium">{movement.projectName || 'المخزن الرئيسي'}</TableCell>
                          <TableCell>{movement.itemName}</TableCell>
                          <TableCell className="text-center font-mono">{`${movement.quantity} ${movement.unit}`}</TableCell>
                          <TableCell className="text-left font-mono">{movement.cost.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</TableCell>
                        </TableRow>
                      )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-4 text-muted-foreground">لا توجد حركات في المخزون لعرضها.</p>
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
