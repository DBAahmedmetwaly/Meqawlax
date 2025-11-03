

'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { LoaderCircle, History } from "lucide-react";
import { listenToAuditLogs, type AuditLog } from '@/services/auditLogService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToAuditLogs((data) => {
      setLogs(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-2xl font-semibold">سجل المراجعة والتدقيق</h1>
            <p className="text-muted-foreground">عرض لجميع الأنشطة والإجراءات التي تمت على النظام.</p>
        </div>
      
      <Card>
        <CardHeader>
          <CardTitle>قائمة الأنشطة</CardTitle>
          <CardDescription>هذا سجل كامل بكل التغييرات التي قام بها المستخدمون.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>التاريخ والوقت</TableHead>
                            <TableHead>المستخدم</TableHead>
                            <TableHead>الإجراء</TableHead>
                            <TableHead>الكيان</TableHead>
                            <TableHead>التفاصيل</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.length > 0 ? logs.map(log => (
                            <TableRow key={log.id}>
                                <TableCell className="font-mono text-xs">{format(new Date(log.timestamp), 'yyyy/MM/dd HH:mm:ss')}</TableCell>
                                <TableCell><Badge variant="secondary">{log.userName}</Badge></TableCell>
                                <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                                <TableCell>{log.entity}</TableCell>
                                <TableCell className="text-sm">{log.details}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <History className="mx-auto h-8 w-8 text-muted-foreground mb-2"/>
                                    لا توجد سجلات لعرضها.
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
