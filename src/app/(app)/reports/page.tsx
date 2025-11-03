
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, FileText, BookOpenCheck, BarChartHorizontal } from "lucide-react";
import Link from "next/link";

const reportTypes = [
    { name: "دفتر الأستاذ العام", href: "/reports/general-ledger", description: "عرض دفتر الأستاذ التفصيلي لأي حساب.", icon: BookOpenCheck },
    { name: "كشف حساب عميل", href: "/reports/customer-statement", description: "عرض كشف حساب تفصيلي لعميل محدد.", icon: FileText },
    { name: "كشف حساب مورد", href: "/reports/supplier-statement", description: "عرض كشف حساب تفصيلي لمورد محدد.", icon: FileText },
    { name: "تقرير المصروفات التفصيلي", href: "/reports/expense-report", description: "تحليل المصروفات حسب الفئة أو المشروع.", icon: FileText },
    { name: "تقرير أداء الموازنة", href: "/reports/budget-performance", description: "مقارنة المبالغ المخصصة بالمصروفات الفعلية.", icon: BarChartHorizontal },
    { name: "تقرير الرواتب", href: "/salaries", description: "عرض ملخص وتفاصيل مسير الرواتب.", icon: FileText },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">التقارير المحاسبية</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => (
          <Card key={report.name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <report.icon className="h-5 w-5 text-primary" />
                <span>{report.name}</span>
              </CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">انقر أدناه لإنشاء وعرض التقرير.</p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href={report.href}>عرض التقرير</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
