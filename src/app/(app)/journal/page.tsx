
'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { FileDown, LoaderCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { listenToJournalEntries, type JournalEntry } from '@/services/journalService';
import { useToast } from '@/hooks/use-toast';

export default function JournalPage() {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        setLoading(true);
        const unsubscribe = listenToJournalEntries((data) => {
            setEntries(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const totalDebits = entries.reduce((sum, entry) => sum + entry.amount, 0);
    
    const handleExport = () => {
        const dataToExport = entries.map(entry => ({
            'التاريخ': entry.date,
            'البيان': entry.description,
            'الحساب المدين': entry.debitAccount,
            'الحساب الدائن': entry.creditAccount,
            'المبلغ': entry.amount,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'قيود اليومية');

        // Set column widths
        worksheet['!cols'] = [
            { wch: 15 }, // Date
            { wch: 50 }, // Description
            { wch: 30 }, // Debit Account
            { wch: 30 }, // Credit Account
            { wch: 15 }, // Amount
        ];
        
        XLSX.writeFile(workbook, 'قيود_اليومية.xlsx');
        toast({ title: 'نجاح', description: 'تم تصدير قيود اليومية بنجاح.'});
    };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">دفتر اليومية العام</h1>
          <p className="text-muted-foreground">عرض جميع الحركات المالية المسجلة في النظام. يتم إنشاء القيود تلقائيًا عند كل معاملة.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={entries.length === 0} className="w-full sm:w-auto">
            <FileDown className="ml-2 h-4 w-4"/>
            تصدير إلى Excel
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
                <TableCaption>قائمة بالقيود المحاسبية المسجلة</TableCaption>
                <TableHeader>
                <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>البيان</TableHead>
                    <TableHead>الحساب المدين</TableHead>
                    <TableHead>الحساب الدائن</TableHead>
                    <TableHead className="w-[150px] text-left">المبلغ</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {entries.length > 0 ? entries.map((entry) => (
                    <TableRow key={entry.id}>
                    <TableCell className="font-mono">{entry.date}</TableCell>
                    <TableCell>
                        {entry.description}
                    </TableCell>
                    <TableCell>
                        <Badge variant="outline">{entry.debitAccount}</Badge>
                    </TableCell>
                    <TableCell>
                        <Badge variant="outline">{entry.creditAccount}</Badge>
                    </TableCell>
                    <TableCell className="text-left font-mono">{entry.amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP'})}</TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            لا توجد قيود يومية مسجلة بعد.
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
                <tfoot className="border-t">
                    <TableRow>
                        <TableCell colSpan={4} className="text-left font-bold">الإجمالي</TableCell>
                        <TableCell className="text-left font-bold font-mono">{totalDebits.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP'})}</TableCell>
                    </TableRow>
                </tfoot>
            </Table>
          </div>
          )}
      </div>
    </div>
  );
}
