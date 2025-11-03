

'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Search, LoaderCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Combobox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { listenToSuppliers, type Supplier } from '@/services/suppliersService';
import { listenToJournalEntries, type JournalEntry } from '@/services/journalService';
import { useSearchParams } from 'next/navigation';

interface LedgerEntry {
    date: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
}

function SupplierStatementPageComponent() {
    const searchParams = useSearchParams();
    const preselectedSupplierId = searchParams.get('id');

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [allJournalEntries, setAllJournalEntries] = useState<JournalEntry[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(preselectedSupplierId);
    const [loading, setLoading] = useState(true);
    const [reportLoading, setReportLoading] = useState(false);
    const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
    const { toast } = useToast();
    
    useEffect(() => {
        if(preselectedSupplierId) {
            handleShowStatement(preselectedSupplierId);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preselectedSupplierId, allJournalEntries]);

    useEffect(() => {
        const unsubscribeSuppliers = listenToSuppliers((data) => {
            setSuppliers(data);
            setLoading(false);
        });
        const unsubscribeJournal = listenToJournalEntries(setAllJournalEntries);

        return () => {
            unsubscribeSuppliers();
            unsubscribeJournal();
        };
    }, []);
    
    const selectedSupplier = useMemo(() => {
        return suppliers.find(s => s.id === selectedSupplierId);
    }, [suppliers, selectedSupplierId]);
    
    const supplierAccountName = "ذمم دائنة - الموردين";

    const handleShowStatement = (supplierId: string | null) => {
        const targetSupplier = suppliers.find(s => s.id === supplierId);
        if (!targetSupplier) {
            if(!reportLoading) toast({ title: 'خطأ', description: 'الرجاء اختيار مورد أولاً.', variant: 'destructive'});
            return;
        }
        setReportLoading(true);

        const openingBalance = targetSupplier.balance;
        
        const relevantEntries = allJournalEntries.filter(
            entry => (entry.creditAccount === supplierAccountName || entry.debitAccount === supplierAccountName) && entry.description.includes(targetSupplier.name)
         ).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let runningBalance = openingBalance;
        const processedEntries: LedgerEntry[] = [];
        
        processedEntries.push({
            date: '',
            description: 'رصيد افتتاحي',
            debit: openingBalance < 0 ? -openingBalance : 0,
            credit: openingBalance > 0 ? openingBalance : 0,
            balance: openingBalance,
        });

        relevantEntries.forEach(entry => {
            const isCredit = entry.creditAccount === supplierAccountName;
            const amount = entry.amount;
            runningBalance += isCredit ? amount : -amount;
            
            processedEntries.push({
                date: entry.date,
                description: entry.description,
                debit: !isCredit ? amount : 0,
                credit: isCredit ? amount : 0,
                balance: runningBalance,
            });
        });

        setLedgerEntries(processedEntries);
        setReportLoading(false);
    };

    const handleExport = () => {
        if (ledgerEntries.length === 0 || !selectedSupplier) {
            toast({ title: 'خطأ', description: 'لا توجد بيانات للتصدير.', variant: 'destructive' });
            return;
        }

        const dataToExport = ledgerEntries.map(entry => ({
            'التاريخ': entry.date,
            'البيان': entry.description,
            'مدين (فاتورة)': entry.credit,
            'دائن (سداد)': entry.debit,
            'الرصيد': entry.balance,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'كشف حساب مورد');
        XLSX.writeFile(workbook, `كشف_حساب_${selectedSupplier.name}.xlsx`);
    }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">تقرير كشف حساب مورد</h1>
      <Card>
        <CardHeader>
          <CardTitle>إنشاء كشف حساب</CardTitle>
          <CardDescription>حدد المورد لعرض كشف الحساب الخاص به.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-end gap-4 mb-6">
                <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">اختر المورد</label>
                    {loading ? <LoaderCircle className="h-5 w-5 animate-spin"/> : (
                        <Combobox
                            placeholder="ابحث عن مورد..."
                            notFoundText="لم يتم العثور على المورد."
                            options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                            onSelect={(value) => setSelectedSupplierId(value)}
                            value={selectedSupplierId || ''}
                        />
                    )}
                </div>
                <Button onClick={() => handleShowStatement(selectedSupplierId)} disabled={!selectedSupplierId || reportLoading}>
                    {reportLoading ? <LoaderCircle className="ml-2 h-4 w-4 animate-spin" /> : <Search className="ml-2 h-4 w-4" />}
                    عرض الكشف
                </Button>
                 <Button variant="outline" onClick={handleExport} disabled={ledgerEntries.length === 0}>
                    <FileDown className="ml-2 h-4 w-4" />
                    تصدير
                </Button>
            </div>
          
           {reportLoading ? (
                 <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                    <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : ledgerEntries.length > 0 && selectedSupplier ? (
                <Table>
                    <TableCaption>كشف حساب للمورد: {selectedSupplier.name}</TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead>التاريخ</TableHead>
                            <TableHead>البيان</TableHead>
                            <TableHead className="text-left">فاتورة (دائن)</TableHead>
                            <TableHead className="text-left">سداد (مدين)</TableHead>
                            <TableHead className="text-left">الرصيد</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ledgerEntries.map((entry, index) => (
                            <TableRow key={index}>
                                <TableCell>{entry.date}</TableCell>
                                <TableCell>{entry.description}</TableCell>
                                <TableCell className="text-left font-mono text-negative">{entry.credit > 0 ? entry.credit.toLocaleString('ar-EG') : '-'}</TableCell>
                                <TableCell className="text-left font-mono text-positive">{entry.debit > 0 ? entry.debit.toLocaleString('ar-EG') : '-'}</TableCell>
                                <TableCell className="text-left font-mono">{entry.balance.toLocaleString('ar-EG')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">سيتم عرض بيانات كشف الحساب هنا بعد اختيار المورد.</p>
                </div>
            )}

        </CardContent>
      </Card>
    </div>
  );
}

export default function SupplierStatementPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SupplierStatementPageComponent />
        </Suspense>
    );
}

