

'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Search, LoaderCircle, Calendar as CalendarIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Combobox } from '@/components/ui/combobox';
import { listenToJournalEntries, type JournalEntry } from '@/services/journalService';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface LedgerEntry {
    date: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
}

function GeneralLedgerPageComponent() {
    const searchParams = useSearchParams();
    const accountIdFromQuery = searchParams.get('accountId');

    const [allJournalEntries, setAllJournalEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [reportLoading, setReportLoading] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<string | null>(accountIdFromQuery);
    const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
    const { toast } = useToast();

    const [dateRange, setDateRange] = useState<{from?: Date, to?: Date}>({});

    useEffect(() => {
        const unsubscribeJournal = listenToJournalEntries((data) => {
            setAllJournalEntries(data);
            setLoading(false);
        });
        return () => unsubscribeJournal();
    }, []);

    useEffect(() => {
        if(accountIdFromQuery && allJournalEntries.length > 0) {
            handleShowLedger();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountIdFromQuery, allJournalEntries]);

    const chartOfAccounts = useMemo(() => {
        const accountSet = new Set<string>();
        allJournalEntries.forEach(entry => {
            accountSet.add(entry.debitAccount);
            accountSet.add(entry.creditAccount);
        });
        return Array.from(accountSet).sort().map(acc => ({ value: acc, label: acc }));
    }, [allJournalEntries]);


    const handleShowLedger = () => {
        if (!selectedAccount) {
            toast({ title: 'خطأ', description: 'الرجاء اختيار حساب أولاً.', variant: 'destructive'});
            return;
        }
        setReportLoading(true);

        const filtered = allJournalEntries.filter((entry) => {
            const matchesAccount = entry.debitAccount === selectedAccount || entry.creditAccount === selectedAccount;
            if (!matchesAccount) return false;

            const entryDate = parseISO(entry.date);
            const isAfterFrom = !dateRange.from || entryDate >= dateRange.from;
            const isBeforeTo = !dateRange.to || entryDate <= dateRange.to;

            return isAfterFrom && isBeforeTo;
        }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = 0;
        const processedEntries: LedgerEntry[] = [];
        
        filtered.forEach(entry => {
            const debit = entry.debitAccount === selectedAccount ? entry.amount : 0;
            const credit = entry.creditAccount === selectedAccount ? entry.amount : 0;
            runningBalance += debit - credit;
            processedEntries.push({
                date: entry.date,
                description: entry.description,
                debit,
                credit,
                balance: runningBalance,
            });
        });
        setLedgerEntries(processedEntries);
        setReportLoading(false);
    };

    const handleExport = () => {
        if (ledgerEntries.length === 0 || !selectedAccount) {
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
        XLSX.utils.book_append_sheet(workbook, worksheet, 'دفتر الأستاذ');
        XLSX.writeFile(workbook, `دفتر_أستاذ_${selectedAccount}.xlsx`);
    }


  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">دفتر الأستاذ العام</h1>
      <Card>
        <CardHeader>
          <CardTitle>عرض حساب الأستاذ</CardTitle>
          <CardDescription>حدد الحساب والفترة الزمنية لعرض دفتر الأستاذ التفصيلي الخاص به.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6 p-4 border rounded-md bg-muted/50">
                <div className="flex-1 space-y-2">
                    <Label>اختر الحساب</Label>
                    {loading ? <LoaderCircle className="h-5 w-5 animate-spin"/> : (
                        <Combobox
                            placeholder="ابحث عن حساب..."
                            notFoundText="لم يتم العثور على الحساب."
                            options={chartOfAccounts}
                            onSelect={(value) => setSelectedAccount(value)}
                            value={selectedAccount || ''}
                        />
                    )}
                </div>
                 <div className="flex-1 space-y-2">
                    <Label>من تاريخ</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal bg-card", !dateRange.from && "text-muted-foreground")}>
                            <CalendarIcon className="ml-2 h-4 w-4" />
                            {dateRange.from ? format(dateRange.from, "PPP") : <span>اختر تاريخ</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateRange.from} onSelect={(d) => setDateRange(prev => ({...prev, from: d}))} initialFocus /></PopoverContent>
                    </Popover>
                </div>
                 <div className="flex-1 space-y-2">
                    <Label>إلى تاريخ</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal bg-card", !dateRange.to && "text-muted-foreground")}>
                            <CalendarIcon className="ml-2 h-4 w-4" />
                            {dateRange.to ? format(dateRange.to, "PPP") : <span>اختر تاريخ</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateRange.to} onSelect={(d) => setDateRange(prev => ({...prev, to: d}))} initialFocus /></PopoverContent>
                    </Popover>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button onClick={handleShowLedger} disabled={!selectedAccount || reportLoading} className="flex-1">
                      {reportLoading ? <LoaderCircle className="ml-2 h-4 w-4 animate-spin"/> : <Search className="ml-2 h-4 w-4" />}
                      عرض
                  </Button>
                   <Button variant="outline" onClick={handleExport} disabled={ledgerEntries.length === 0} className="flex-1">
                      <FileDown className="ml-2 h-4 w-4" />
                      تصدير
                  </Button>
                </div>
            </div>

            {reportLoading ? (
                 <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                    <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : ledgerEntries.length > 0 ? (
                <Table>
                    <TableCaption>دفتر الأستاذ للحساب: {selectedAccount}</TableCaption>
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
                    <p className="text-muted-foreground">سيتم عرض بيانات دفتر الأستاذ هنا بعد اختيار الحساب.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}


export default function GeneralLedgerPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div>}>
            <GeneralLedgerPageComponent />
        </Suspense>
    )
}
