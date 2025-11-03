

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { HardHat, LoaderCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getSettings } from '@/services/settingsService';


export default function LoginPage() {
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [appName, setAppName] = useState("Bana'i");
  const [version] = useState("1.0.0.1");

    useEffect(() => {
        getSettings().then(settings => {
            if (settings.appName) {
                setAppName(settings.appName);
            }
        });
    }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await login(code, pin);
      if (user) {
        toast({ title: `مرحباً بك، ${user.name}` });
        router.replace('/'); // Redirect to welcome page
      } else {
        throw new Error('بيانات الدخول غير صحيحة.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع.';
      toast({
        title: 'فشل تسجيل الدخول',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="absolute top-8 flex items-center gap-2 text-lg font-semibold">
          <HardHat className="h-7 w-7 text-primary" />
          <span>{appName} - نظام إدارة المشاريع</span>
        </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">تسجيل الدخول {version}</CardTitle>
          <CardDescription>الرجاء إدخال كود المستخدم ورمز المرور.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">كود المستخدم</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                disabled={isLoading}
                placeholder="أدخل الكود الخاص بك"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">رمز المرور (PIN)</Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                disabled={isLoading}
                placeholder="****"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
              تسجيل الدخول
            </Button>
          </CardFooter>
        </form>
      </Card>
       <p className="mt-8 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {appName}. جميع الحقوق محفوظة.
        </p>
    </div>
  );
}
