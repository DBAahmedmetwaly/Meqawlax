
'use client';

import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Search, LoaderCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Combobox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { listenToCustomers, type Customer } from '@/services/customersService';
import { listenToJournalEntries, type JournalEntry } from '@/services/journalService';

interface LedgerEntry {
    date: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
}

export default function CustomerStatementPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [allJournalEntries, setAllJournalEntries] = useState<JournalEntry[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [reportLoading, setReportLoading] = useState(false);
    const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribeCustomers = listenToCustomers((data) => {
            setCustomers(data);
            setLoading(false);
        });
        const unsubscribeJournal = listenToJournalEntries(setAllJournalEntries);

        return () => {
            unsubscribeCustomers();
            unsubscribeJournal();
        };
    }, []);
    
    const selectedCustomer = useMemo(() => {
        return customers.find(c => c.id === selectedCustomerId);
    }, [customers, selectedCustomerId]);
    
    const customerAccountName = useMemo(() => {
        if (!selectedCustomer) return '';
        // This is a convention based on how customer accounts are named in the system
        return `ذمم مدينة - العملاء`;
    }, [selectedCustomer]);


    const handleShowStatement = () => {
        if (!selectedCustomer) {
            toast({ title: 'خطأ', description: 'الرجاء اختيار عميل أولاً.', variant: 'destructive'});
            return;
        }
        setReportLoading(true);

        const customerOpeningBalance = selectedCustomer.balance;

        const relevantEntries = allJournalEntries.filter(
            entry => entry.debitAccount.includes(customer.name) || entry.creditAccount.includes(customer.name)
        ).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let runningBalance = customerOpeningBalance;
        const processedEntries: LedgerEntry[] = [];
        
        processedEntries.push({
            date: '',
            description: 'رصيد افتتاحي',
            debit: customerOpeningBalance > 0 ? customerOpeningBalance : 0,
            credit: customerOpeningBalance < 0 ? -customerOpeningBalance : 0,
            balance: customerOpeningBalance,
        });

        relevantEntries.forEach(entry => {
            const isDebit = entry.debitAccount.includes(customer.name);
            const amount = entry.amount;
            runningBalance += isDebit ? amount : -amount;
            
            processedEntries.push({
                date: entry.date,
                description: entry.description,
                debit: isDebit ? amount : 0,
                credit: !isDebit ? amount : 0,
                balance: runningBalance,
            });
        });

        setLedgerEntries(processedEntries);
        setReportLoading(false);
    };

    const handleExport = () => {
        if (ledgerEntries.length === 0 || !selectedCustomer) {
            toast({ title: 'خطأ', description: 'لا توجد بيانات للتصدير.', variant: 'destructive' });
            return;
        }

        const dataToExport = ledgerEntries.map(entry => ({
            'التاريخ': entry.date,
            'البيان': entry.description,
            'مدين': entry.debit,
            'دائن': entry.credit,
            'الرصيد': entry.balance,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'كشف حساب عميل');
        XLSX.writeFile(workbook, `كشف_حساب_${selectedCustomer.name}.xlsx`);
    }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">تقرير كشف حساب عميل</h1>
      <Card>
        <CardHeader>
          <CardTitle>إنشاء كشف حساب</CardTitle>
          <CardDescription>حدد العميل لعرض كشف الحساب الخاص به.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-end gap-4 mb-6">
                <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">اختر العميل</label>
                    {loading ? <LoaderCircle className="h-5 w-5 animate-spin"/> : (
                         <Combobox
                            placeholder="ابحث عن عميل..."
                            notFoundText="لم يتم العثور على العميل."
                            options={customers.map(c => ({ value: c.id, label: c.name }))}
                            onSelect={(value) => setSelectedCustomerId(value)}
                            value={selectedCustomerId || ''}
                        />
                    )}
                </div>
                <Button onClick={handleShowStatement} disabled={!selectedCustomerId || reportLoading}>
                    {reportLoading ? <LoaderCircle className="ml-2 h-4 w-4 animate-spin"/> : <Search className="ml-2 h-4 w-4" />}
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
            ) : ledgerEntries.length > 0 && selectedCustomer ? (
                <Table>
                    <TableCaption>كشف حساب للعميل: {selectedCustomer.name}</TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead>التاريخ</TableHead>
                            <TableHead>البيان</TableHead>
                            <TableHead className="text-left">مدين (ج.م.)</TableHead>
                            <TableHead className="text-left">دائن (ج.م.)</TableHead>
                            <TableHead className="text-left">الرصيد (ج.م.)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ledgerEntries.map((entry, index) => (
                            <TableRow key={index}>
                                <TableCell>{entry.date}</TableCell>
                                <TableCell>{entry.description}</TableCell>
                                <TableCell className="text-left font-mono text-positive">{entry.debit > 0 ? entry.debit.toLocaleString('ar-EG') : '-'}</TableCell>
                                <TableCell className="text-left font-mono text-negative">{entry.credit > 0 ? entry.credit.toLocaleString('ar-EG') : '-'}</TableCell>
                                <TableCell className="text-left font-mono">{entry.balance.toLocaleString('ar-EG')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">سيتم عرض بيانات كشف الحساب هنا بعد اختيار العميل.</p>
                </div>
            )}

        </CardContent>
      </Card>
    </div>
  );
}
