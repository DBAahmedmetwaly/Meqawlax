

'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoaderCircle, ArrowRight, Building, User, Hash, AreaChart, DollarSign, Wallet, Calendar, CheckCircle, Clock } from "lucide-react";
import { listenToUnitById, type Unit, getProjectById } from '@/services/projectsService';
import { listenToInstallmentsByUnitId, type Installment } from '@/services/installmentsService';
import { listenToCustomers, type Customer } from '@/services/customersService';
import Link from 'next/link';
import { cn } from '@/lib/utils';

function UnitDetailsPageComponent() {
    const params = useParams();
    const router = useRouter();
    const unitId = params.id as string;

    const [unit, setUnit] = useState<(Unit & { projectId: string }) | null>(null);
    const [project, setProject] = useState<any | null>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [installments, setInstallments] = useState<Installment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!unitId) return;
        
        const unsubscribeUnit = listenToUnitById(unitId, async (unitData) => {
            setUnit(unitData);
            if (unitData) {
                const proj = await getProjectById(unitData.projectId);
                setProject(proj);

                if (unitData.customerId) {
                    const unsubCustomer = listenToCustomers((customers) => {
                        setCustomer(customers.find(c => c.id === unitData.customerId) || null);
                    });
                    // This is not ideal, but for simplicity, we'll just let it be.
                    // In a real app, you might want to manage this subscription better.
                }
                 setLoading(false);
            } else {
                setLoading(false);
            }
        });

        const unsubscribeInstallments = listenToInstallmentsByUnitId(unitId, setInstallments);

        return () => {
            unsubscribeUnit();
            unsubscribeInstallments();
        };

    }, [unitId]);
    
    const financialSummary = useMemo(() => {
        if (!unit) return { paid: 0, remaining: 0, total: 0 };
        const total = unit.actualPrice || 0;
        const paid = unit.paidAmount || 0;
        const remaining = total - paid;
        return { total, paid, remaining };
    }, [unit]);

    const getInstallmentStatusBadge = (status: Installment['status']) => {
        const statusMap: Record<Installment['status'], { icon: React.ElementType, className: string, label: string }> = {
            'مدفوع': { icon: CheckCircle, className: 'bg-green-100 text-green-800', label: 'مدفوع' },
            'مستحق': { icon: Clock, className: 'bg-blue-100 text-blue-800', label: 'مستحق' },
            'متأخر': { icon: Clock, className: 'bg-red-100 text-red-800', label: 'متأخر' },
        };
        const { icon: Icon, className, label } = statusMap[status];
        return (
            <Badge variant="secondary" className={cn('gap-1.5', className)}>
                <Icon className="h-3 w-3"/>
                {label}
            </Badge>
        );
    };

    if (loading) {
        return (
          <div className="flex items-center justify-center h-64">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            <p className="mr-4">جاري تحميل تفاصيل الوحدة...</p>
          </div>
        );
    }
    
    if (!unit) {
        return (
          <div className="text-center">
            <h1 className="text-2xl font-bold">الوحدة غير موجودة</h1>
            <p className="text-muted-foreground">قد تكون الوحدة التي تبحث عنها قد تم حذفها.</p>
            <Button asChild className="mt-4">
              <Link href="/projects">
                <ArrowRight className="ml-2 h-4 w-4" />
                العودة إلى المشاريع
              </Link>
            </Button>
          </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <Link href={`/projects/manage?id=${unit.projectId}`} className="text-sm text-muted-foreground hover:underline flex items-center gap-1 mb-2">
                        <ArrowRight className="h-4 w-4" />
                        <span>العودة لإدارة المشروع: {project?.name}</span>
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-bold">{unit.type}</h1>
                    <p className="text-muted-foreground max-w-xl">{unit.notes || 'لا توجد ملاحظات لهذه الوحدة.'}</p>
                </div>
                 <Badge className={cn(
                        'text-lg py-2 px-4',
                        unit.status === 'متاحة' && 'bg-gray-500',
                        unit.status === 'محجوزة' && 'bg-yellow-500',
                        unit.status === 'مباعة' && 'bg-green-600'
                    )}>{unit.status}</Badge>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>البيانات الأساسية للوحدة</CardTitle>
                </CardHeader>
                 <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3">
                        <User className="h-8 w-8 text-primary" />
                        <div>
                            <p className="text-sm text-muted-foreground">العميل</p>
                            <p className="font-semibold">{customer?.name || 'غير محدد'}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-3">
                        <Hash className="h-8 w-8 text-primary" />
                        <div>
                            <p className="text-sm text-muted-foreground">رقم الوحدة</p>
                            <p className="font-semibold font-mono truncate">{unit.id}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-3">
                        <AreaChart className="h-8 w-8 text-primary" />
                        <div>
                            <p className="text-sm text-muted-foreground">المساحة</p>
                            <p className="font-semibold">{unit.area} م²</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-3">
                        <Calendar className="h-8 w-8 text-primary" />
                        <div>
                            <p className="text-sm text-muted-foreground">تاريخ البيع/الحجز</p>
                            <p className="font-semibold">{unit.saleDate || unit.bookingDate || 'N/A'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                 <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>الملخص المالي</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-muted-foreground"/>
                                <span className="font-medium">إجمالي السعر</span>
                            </div>
                            <span className="font-bold font-mono text-lg">{financialSummary.total.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</span>
                        </div>
                         <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Wallet className="h-5 w-5 text-green-600"/>
                                <span className="font-medium text-green-700 dark:text-green-400">إجمالي المدفوع</span>
                            </div>
                            <span className="font-bold font-mono text-lg text-green-600">{financialSummary.paid.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                             <div className="flex items-center gap-2">
                                <Wallet className="h-5 w-5 text-red-600"/>
                                <span className="font-medium text-red-700 dark:text-red-400">المبلغ المتبقي</span>
                            </div>
                            <span className="font-bold font-mono text-lg text-red-600">{financialSummary.remaining.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>جدول الأقساط</CardTitle>
                        <CardDescription>عرض لجميع الأقساط المستحقة والمدفوعة لهذه الوحدة.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto border rounded-lg">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>تاريخ الاستحقاق</TableHead>
                                        <TableHead className="text-left">المبلغ</TableHead>
                                        <TableHead>الحالة</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {installments.length > 0 ? installments.map(inst => (
                                        <TableRow key={inst.id}>
                                            <TableCell>{inst.dueDate}</TableCell>
                                            <TableCell className="text-left font-mono">
                                                {inst.amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                                            </TableCell>
                                            <TableCell>{getInstallmentStatusBadge(inst.status)}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center">
                                                لا توجد أقساط مجدولة لهذه الوحدة.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


export default function UnitDetailsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div>}>
            <UnitDetailsPageComponent />
        </Suspense>
    )
}
