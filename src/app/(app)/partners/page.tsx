
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, LoaderCircle, Handshake, MoreVertical, Percent, Settings, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addPartner, listenToPartners, type Partner } from '@/services/partnersService';
import { listenToProjects, type Project, type ProjectPartner } from '@/services/projectsService';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PartnerProjectInfo {
    partnerId: string;
    partnerName: string;
    projectId: string;
    projectName: string;
    investmentInProject: number;
    profitShare: number;
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    const unsubscribePartners = listenToPartners(setPartners);
    const unsubscribeProjects = listenToProjects((projectData) => {
        setProjects(projectData);
        setLoading(false);
    });

    return () => {
        unsubscribePartners();
        unsubscribeProjects();
    };
  }, []);

  const partnerProjectData = useMemo((): PartnerProjectInfo[] => {
    if (loading) return [];
    
    const allPartnerProjects: PartnerProjectInfo[] = [];

    projects.forEach(project => {
        if (project.partners) {
            Object.values(project.partners).forEach(partnerInfo => {
                 const totalInvestmentInProject = (partnerInfo.landInvestment || 0) + (partnerInfo.buildingInvestment || 0);
                 allPartnerProjects.push({
                    partnerId: partnerInfo.id,
                    partnerName: partnerInfo.name,
                    projectId: project.id,
                    projectName: project.name,
                    investmentInProject: totalInvestmentInProject,
                    profitShare: partnerInfo.profitShare,
                });
            });
        }
    });

    return allPartnerProjects;
  }, [projects, loading]);

  const handleAddPartner = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const initialInvestment = parseFloat(formData.get('initialInvestment') as string) || 0;

    const newPartner: Omit<Partner, 'id'> = {
      name,
      totalInvestment: initialInvestment,
    };

    try {
      await addPartner(newPartner);
      toast({ title: 'نجاح', description: 'تمت إضافة الشريك بنجاح.' });
      setOpenAddDialog(false);
      form.reset();
    } catch (error) {
      toast({ title: 'خطأ', description: 'لم تتم إضافة الشريك.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-2xl font-semibold">استثمارات الشركاء في المشاريع</h1>
            <p className="text-muted-foreground">عرض تفصيلي لاستثمارات كل شريك وحصته في كل مشروع.</p>
        </div>
        <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <PlusCircle className="ml-2 h-4 w-4" />
              إضافة شريك جديد للنظام
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة شريك جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddPartner} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم الشريك</Label>
                <Input id="name" name="name" placeholder="أدخل اسم الشريك" required disabled={isSubmitting} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initialInvestment">إجمالي الاستثمار المبدئي (اختياري)</Label>
                <Input
                  id="initialInvestment"
                  name="initialInvestment"
                  type="number"
                  placeholder="0"
                  defaultValue="0"
                  disabled={isSubmitting}
                />
                 <p className="text-xs text-muted-foreground">هذا يمثل إجمالي رأس المال المدفوع من الشريك عبر كل المشاريع.</p>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" disabled={isSubmitting}>
                    إلغاء
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                  حفظ
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>قائمة استثمارات الشركاء</CardTitle>
          <CardDescription>عرض تفصيلي لاستثمارات الشركاء موزعة على المشاريع.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم الشريك</TableHead>
                    <TableHead>المشروع</TableHead>
                    <TableHead className="text-left">الاستثمار في المشروع</TableHead>
                    <TableHead className="text-left">حصة الربح</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnerProjectData.length > 0 ? (
                    partnerProjectData.map((item, index) => (
                      <TableRow key={`${item.partnerId}-${item.projectId}-${index}`}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <Handshake className="h-4 w-4 text-muted-foreground"/>
                          {item.partnerName}
                        </TableCell>
                        <TableCell>
                          <Link href={`/projects/${item.projectId}`} className="hover:underline text-primary">
                            {item.projectName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-left font-mono text-positive">
                          {item.investmentInProject.toLocaleString('ar-EG', {
                            style: 'currency',
                            currency: 'EGP',
                          })}
                        </TableCell>
                         <TableCell className="text-left font-mono">
                            <div className="flex items-center justify-start gap-1">
                                <span>{item.profitShare.toFixed(2)}</span>
                                <Percent className="h-3 w-3 text-muted-foreground"/>
                            </div>
                        </TableCell>
                        <TableCell className="text-center">
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => router.push(`/projects/manage?id=${item.projectId}`)}>
                                  <Settings className="ml-2 h-4 w-4" />
                                  <span>إدارة المشروع</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/projects/${item.projectId}`)}>
                                  <Eye className="ml-2 h-4 w-4" />
                                  <span>عرض صفحة المشروع</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        لا توجد استثمارات للشركاء في أي مشاريع لعرضها.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <p className="text-sm text-muted-foreground">إجمالي الاستثمارات المعروضة: {partnerProjectData.length}</p>
        </CardFooter>
      </Card>
    </div>
  );
}
