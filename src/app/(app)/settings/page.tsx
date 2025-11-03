


'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LoaderCircle, TriangleAlert } from 'lucide-react';
import { seedTestData, backupData, deleteAllData } from '@/services/dataService';
import { getSettings, updateSettings, type AppSettings } from '@/services/settingsService';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await updateSettings(settings);
      toast({ title: 'نجاح', description: 'تم حفظ الإعدادات بنجاح.' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل حفظ الإعدادات.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeedTestData = async () => {
    setIsSeeding(true);
    try {
      await seedTestData();
      toast({ title: 'نجاح', description: 'تمت إضافة بيانات الاختبار بنجاح.' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشلت عملية إضافة بيانات الاختبار.', variant: 'destructive' });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleBackupData = async () => {
    setIsBackingUp(true);
    try {
      const backupJson = await backupData();
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `banai-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'نجاح', description: 'تم إنشاء النسخة الاحتياطية بنجاح.' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشلت عملية النسخ الاحتياطي.', variant: 'destructive' });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDeleteAllData = async () => {
    setIsDeleting(true);
    try {
      await deleteAllData();
      toast({ title: 'نجاح', description: 'تم حذف جميع البيانات بنجاح.' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشلت عملية الحذف.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };
  
  if (!settings) {
    return (
        <div className="flex items-center justify-center h-64">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">الإعدادات العامة</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>إعدادات التطبيق</CardTitle>
          <CardDescription>تحكم في الإعدادات الأساسية للبرنامج.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
             <div className="space-y-2">
                <Label htmlFor="appName">اسم البرنامج</Label>
                <Input
                    id="appName"
                    value={settings.appName}
                    onChange={(e) => setSettings(prev => prev ? ({ ...prev, appName: e.target.value }) : null)}
                    placeholder="Bana'i Tracker"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="currency">عملة البرنامج</Label>
                     <Select
                        value={settings.currency}
                        onValueChange={(value) => setSettings(prev => prev ? ({...prev, currency: value as 'EGP' | 'USD' | 'SAR'}) : null)}
                    >
                        <SelectTrigger id="currency">
                            <SelectValue placeholder="اختر العملة" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="EGP">جنيه مصري (EGP)</SelectItem>
                            <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                            <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="toastDuration">مدة ظهور الإشعار (بالثواني)</Label>
                    <Input
                        id="toastDuration"
                        type="number"
                        value={settings.toastDuration / 1000}
                        onChange={(e) => setSettings(prev => prev ? ({ ...prev, toastDuration: Number(e.target.value) * 1000 }) : null)}
                        placeholder="5"
                    />
                </div>
            </div>
             <div className="space-y-3 pt-4 border-t">
                <Label>استراتيجية التعامل مع تجاوز التكاليف</Label>
                <RadioGroup 
                    value={settings.costOverrunStrategy}
                    onValueChange={(value) => setSettings(prev => prev ? ({...prev, costOverrunStrategy: value as 'reduceProfitMargin' | 'increasePrice'}) : null)}
                    className="space-y-2"
                 >
                    <div className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value="reduceProfitMargin" id="reduceProfit" />
                        <Label htmlFor="reduceProfit" className="font-normal">
                            تخفيض هامش الربح تلقائيًا لامتصاص التكاليف الزائدة.
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value="increasePrice" id="increasePrice" />
                        <Label htmlFor="increasePrice" className="font-normal">
                           زيادة سعر المتر للوحدات المتبقية تلقائيًا للحفاظ على هامش الربح.
                        </Label>
                    </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">هذا الإعداد يحدد كيفية تفاعل النظام عند تجاوز المصروفات الفعلية للمشروع التكاليف التقديرية.</p>
            </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleSaveSettings} disabled={isSaving}>
                {isSaving && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                حفظ الإعدادات
            </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>عمليات البيانات</CardTitle>
          <CardDescription>
            إدارة بيانات التطبيق. استخدم هذه العمليات بحذر.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start justify-between p-4 border rounded-md">
            <div>
              <h3 className="font-semibold">إضافة بيانات اختبار</h3>
              <p className="text-sm text-muted-foreground">سيؤدي هذا إلى مسح جميع البيانات الحالية وإضافة مجموعة من البيانات التجريبية.</p>
            </div>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="secondary" disabled={isSeeding}>
                        {isSeeding && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                        إضافة بيانات اختبار
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>تأكيد العملية</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogDescription>هل أنت متأكد؟ سيتم حذف جميع البيانات الحالية بشكل دائم واستبدالها ببيانات تجريبية.</AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSeedTestData}>نعم، قم بالإضافة</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>
           <div className="flex flex-col sm:flex-row gap-4 items-start justify-between p-4 border rounded-md">
            <div>
              <h3 className="font-semibold">إنشاء نسخة احتياطية</h3>
              <p className="text-sm text-muted-foreground">تنزيل نسخة كاملة من جميع بيانات التطبيق في ملف JSON.</p>
            </div>
            <Button onClick={handleBackupData} disabled={isBackingUp}>
                {isBackingUp && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                تنزيل نسخة احتياطية
            </Button>
          </div>
           <Card className="border-destructive">
                <CardHeader className="flex flex-col sm:flex-row gap-4 items-start justify-between">
                     <div className="flex items-start gap-4">
                        <TriangleAlert className="h-6 w-6 text-destructive flex-shrink-0" />
                        <div>
                            <h3 className="font-semibold text-destructive">منطقة الخطر</h3>
                             <p className="text-sm text-muted-foreground">
                                الإجراء التالي لا يمكن التراجع عنه. الرجاء التأكد قبل المتابعة.
                             </p>
                        </div>
                    </div>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isDeleting} className="w-full sm:w-auto">
                                {isDeleting && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                                حذف جميع البيانات
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle></AlertDialogHeader>
                            <AlertDialogDescription>
                                هذا الإجراء سيقوم بحذف جميع البيانات في قاعدة البيانات بشكل نهائي، بما في ذلك المشاريع، المصروفات، العملاء، وكل شيء آخر. لا يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                             <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={handleDeleteAllData}>نعم، أفهم المخاطر، قم بالحذف</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardHeader>
           </Card>
        </CardContent>
      </Card>
    </div>
  );
}
