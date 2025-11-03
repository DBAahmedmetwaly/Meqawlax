
'use client';

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HardHat } from "lucide-react";
import { getSettings } from "@/services/settingsService";
import { useEffect, useState } from "react";

export default function WelcomePage() {
    const { user } = useAuth();
    const [appName, setAppName] = useState("Bana'i Tracker");

    useEffect(() => {
        getSettings().then(settings => {
            if (settings.appName) {
                setAppName(settings.appName);
            }
        });
    }, []);

    return (
        <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-2xl text-center p-8">
                <CardHeader>
                    <HardHat className="h-16 w-16 text-primary mx-auto mb-4" />
                    <CardTitle className="text-3xl">مرحباً بك في نظام {appName}</CardTitle>
                    <CardDescription className="text-lg text-muted-foreground mt-2">
                        يا {user?.name || 'مستخدم'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="mb-6">
                        نظامك المتكامل لإدارة مشاريع المقاولات. من هنا يمكنك التحكم في كل جوانب عملك بكفاءة وسهولة.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Button asChild size="lg">
                            <Link href="/projects">
                                تصفح المشاريع
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="lg">
                             <Link href="/dashboard">
                                الانتقال إلى لوحة التحكم
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
