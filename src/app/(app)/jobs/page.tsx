
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreVertical, FilePenLine, Trash2, LoaderCircle, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { addJob, listenToJobs, deleteJob, updateJob, type Job, type ScreenPermissions, type ActionPermissions } from '@/services/jobsService';
import { Checkbox } from '@/components/ui/checkbox';
import { navItems } from '@/config/nav';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const availablePermissionActions: (keyof ActionPermissions)[] = ['view', 'add', 'edit', 'delete', 'print'];
const permissionActionLabels: Record<keyof ActionPermissions, string> = {
    view: 'عرض',
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    print: 'طباعة',
}

const allPermissions = navItems.flatMap(item => 
    item.subItems ? item.subItems.map(sub => ({ path: sub.href, label: `${item.label} > ${sub.label}` })) : [{ path: item.href, label: item.label }]
);


export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dialogState, setDialogState] = useState<{ open: boolean, mode: 'add' | 'edit', job?: Job }>({ open: false, mode: 'add' });
  const [currentPermissions, setCurrentPermissions] = useState<ScreenPermissions>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToJobs((jobsData) => {
        setJobs(jobsData);
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  const openDialog = (mode: 'add' | 'edit', job?: Job) => {
      setDialogState({ open: true, mode, job });
      setCurrentPermissions(job?.permissions || {});
  }

  const closeDialog = () => {
      setDialogState({ open: false, mode: 'add' });
      setCurrentPermissions({});
  }

  const handleSaveJob = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = formData.get('title') as string;
    const salary = parseFloat(formData.get('salary') as string);

    if (!title || !salary) {
      toast({ title: "خطأ", description: "الرجاء تعبئة جميع الحقول.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    // Clean up permissions: remove any screen that doesn't have at least one 'true' value
    const cleanedPermissions = Object.entries(currentPermissions).reduce((acc, [path, perms]) => {
        if(Object.values(perms).some(v => v === true)) {
            acc[path] = perms;
        }
        return acc;
    }, {} as ScreenPermissions)

    const jobData = { title, salary, permissions: cleanedPermissions };

    try {
      if (dialogState.mode === 'add') {
        await addJob(jobData);
        toast({ title: "نجاح", description: `تمت إضافة وظيفة "${title}" بنجاح.` });
      } else if (dialogState.job) {
        await updateJob(dialogState.job.id, jobData);
        toast({ title: "نجاح", description: `تم تعديل وظيفة "${title}" بنجاح.` });
      }
      closeDialog();
      form.reset();
    } catch (error) {
      toast({ title: "خطأ", description: "لم يتم حفظ الوظيفة", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if(window.confirm('هل أنت متأكد من حذف هذه الوظيفة؟')) {
        try {
            await deleteJob(jobId);
            toast({ title: "نجاح", description: "تم حذف الوظيفة." });
        } catch (error) {
            toast({ title: "خطأ", description: "لم يتم حذف الوظيفة.", variant: "destructive" });
        }
    }
  }
  
  const handlePermissionChange = (path: string, action: keyof ActionPermissions, checked: boolean) => {
    setCurrentPermissions(prev => {
        const newPerms = { ...prev };
        if (!newPerms[path]) {
            newPerms[path] = { view: false, add: false, edit: false, delete: false, print: false };
        }
        
        const pathPermissions = { ...newPerms[path], [action]: checked };

        // If 'view' is unchecked, uncheck all others
        if(action === 'view' && !checked) {
            Object.keys(pathPermissions).forEach(key => {
                pathPermissions[key as keyof ActionPermissions] = false;
            });
        }
        
        // If any action is checked, ensure 'view' is also checked
        if(action !== 'view' && checked) {
            pathPermissions.view = true;
        }

        newPerms[path] = pathPermissions;

        return newPerms;
    });
  }

  const countEnabledPermissions = (permissions?: ScreenPermissions) => {
    if (!permissions) return 0;
    return Object.values(permissions).reduce((acc, perms) => {
        return acc + Object.values(perms).filter(v => v === true).length;
    }, 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">الوظائف والصلاحيات</h1>
          <p className="text-muted-foreground">إدارة المسميات الوظيفية والرواتب والصلاحيات المرتبطة بكل وظيفة.</p>
        </div>
        <Button onClick={() => openDialog('add')} className="w-full sm:w-auto">
            <PlusCircle className="ml-2 h-4 w-4" />
            إضافة وظيفة جديدة
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
          {loading ? (
             <div className="flex items-center justify-center h-48">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المسمى الوظيفي</TableHead>
                <TableHead className="text-left">الراتب الأساسي</TableHead>
                <TableHead className="text-left">عدد الصلاحيات الممنوحة</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length > 0 ? (
                jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell className="text-left font-mono">
                      {job.salary.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                    </TableCell>
                     <TableCell className="text-left">
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                            <ShieldCheck className="h-3 w-3" />
                            {countEnabledPermissions(job.permissions)} صلاحيات
                        </Badge>
                     </TableCell>
                    <TableCell className="text-center">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => openDialog('edit', job)}>
                            <FilePenLine className="ml-2 h-4 w-4" />
                            <span>تعديل</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteJob(job.id)}>
                            <Trash2 className="ml-2 h-4 w-4" />
                            <span>حذف</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    لا توجد وظائف لعرضها حالياً.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
          )}
      </div>

       <Dialog open={dialogState.open} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{dialogState.mode === 'add' ? 'إضافة وظيفة جديدة' : 'تعديل وظيفة'}</DialogTitle>
              <DialogDescription>
                أدخل البيانات الأساسية للوظيفة ثم حدد الإجراءات المسموحة لكل شاشة.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveJob} className="space-y-4">
            <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger>البيانات الأساسية للوظيفة</AccordionTrigger>
                    <AccordionContent>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2">
                            <Label htmlFor="title">المسمى الوظيفي</Label>
                            <Input id="title" name="title" defaultValue={dialogState.job?.title} placeholder="مثال: مهندس مدني" required disabled={isSubmitting} />
                            </div>
                            <div className="space-y-2">
                            <Label htmlFor="salary">الراتب الأساسي (بالجنيه المصري)</Label>
                            <Input id="salary" name="salary" type="number" defaultValue={dialogState.job?.salary} placeholder="أدخل الراتب" required disabled={isSubmitting}/>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger>صلاحيات الوصول</AccordionTrigger>
                    <AccordionContent>
                        <div className="max-h-[50vh] overflow-y-auto mt-4">
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>الشاشة</TableHead>
                                       {availablePermissionActions.map(action => (
                                           <TableHead key={action} className="text-center">{permissionActionLabels[action]}</TableHead>
                                       ))}
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {allPermissions.map(perm => (
                                       <TableRow key={perm.path}>
                                           <TableCell className="font-medium">{perm.label}</TableCell>
                                           {availablePermissionActions.map(action => (
                                                <TableCell key={action} className="text-center">
                                                    <Checkbox
                                                        checked={currentPermissions[perm.path]?.[action] || false}
                                                        onCheckedChange={(checked) => handlePermissionChange(perm.path, action, !!checked)}
                                                        disabled={(action !== 'view' && !currentPermissions[perm.path]?.view) && !currentPermissions[perm.path]?.[action]}
                                                    />
                                                </TableCell>
                                           ))}
                                       </TableRow>
                                   ))}
                               </TableBody>
                           </Table>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            
              <DialogFooter className="pt-4 border-t">
                <DialogClose asChild>
                  <Button type="button" variant="secondary" disabled={isSubmitting}>إلغاء</Button>
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
  );
}
