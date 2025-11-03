
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { LoaderCircle } from "lucide-react";
import { listenToProjects, type Project } from '@/services/projectsService';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function BudgetPerformanceReportPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribeProjects = listenToProjects((data) => {
      setProjects(data);
      setLoading(false);
    });

    return () => unsubscribeProjects();
  }, []);

  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);
  
  const chartData = useMemo(() => {
    if (!selectedProject || !selectedProject.budgetItems) return [];
    return Object.values(selectedProject.budgetItems).map(item => ({
        name: item.name,
        'المبلغ المخصص': item.allocatedAmount,
        'المصروف الفعلي': item.spentAmount,
    }));
  }, [selectedProject]);
  
 const chartConfig = {
    'المبلغ المخصص': {
        label: "المبلغ المخصص",
        color: "#3b82f6",
    },
    'المصروف الفعلي': {
        label: "المصروف الفعلي",
        color: "#f97316",
    },
} satisfies ChartConfig;


  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">تقرير أداء الموازنة للمشاريع</h1>
      <Card>
        <CardHeader>
          <CardTitle>تحليل أداء الموازنة</CardTitle>
          <CardDescription>اختر مشروعًا لعرض مقارنة بين المبالغ المخصصة والمصروفات الفعلية لكل بند من بنود الموازنة.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm mb-8">
            <Label>اختر المشروع</Label>
             <Combobox
                placeholder="ابحث عن مشروع..."
                notFoundText="لم يتم العثور على المشروع."
                options={projects.map(p => ({ value: p.id, label: p.name }))}
                onSelect={(value) => setSelectedProjectId(value)}
                value={selectedProjectId || ''}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedProject && chartData.length > 0 ? (
             <ChartContainer config={chartConfig} className="h-[500px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(value) => new Intl.NumberFormat('ar-EG', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={150} />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Legend />
                        <Bar dataKey="المبلغ المخصص" fill={chartConfig['المبلغ المخصص'].color} radius={4} />
                        <Bar dataKey="المصروف الفعلي" fill={chartConfig['المصروف الفعلي'].color} radius={4} />
                    </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">
                {selectedProjectId ? "لا توجد بيانات موازنة لهذا المشروع." : "الرجاء اختيار مشروع لعرض التقرير."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
