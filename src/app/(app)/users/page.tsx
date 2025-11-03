
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
import { PlusCircle, LoaderCircle, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addUser, listenToUsers, updateUser, type User } from '@/services/usersService';
import { listenToJobs, type Job } from '@/services/jobsService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const [dialogState, setDialogState] = useState<{ open: boolean, mode: 'add' | 'edit', user?: User }>({ open: false, mode: 'add' });

  useEffect(() => {
    setLoading(true);
    const unsubscribeUsers = listenToUsers((usersData) => {
      setUsers(usersData);
      setLoading(false);
    });
    const unsubscribeJobs = listenToJobs(setJobs);

    return () => {
        unsubscribeUsers();
        unsubscribeJobs();
    }
  }, []);

  const openDialog = (mode: 'add' | 'edit', user?: User) => {
    setDialogState({ open: true, mode, user });
  };
  
  const closeDialog = () => {
    setDialogState({ open: false, mode: 'add' });
  }

  const handleSaveUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const code = formData.get('code') as string;
    const pin = formData.get('pin') as string;
    const jobId = formData.get('jobId') as string;
    const isAdmin = formData.get('isAdmin') === 'on';

    if (!name || !code || !pin || !jobId) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول الإلزامية.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    try {
      if (dialogState.mode === 'add') {
          const newUser: Omit<User, 'id'> = { name, code, pin, jobId, isAdmin, status: 'نشط' };
          await addUser(newUser);
          toast({ title: 'نجاح', description: 'تمت إضافة المستخدم بنجاح.' });
      } else if (dialogState.user) {
          const updatedData: Partial<Omit<User, 'id'>> = { name, code, jobId, isAdmin };
          if(pin) { // Only update PIN if a new one is entered
              updatedData.pin = pin;
          }
          await updateUser(dialogState.user.id, updatedData);
          toast({ title: 'نجاح', description: 'تم تعديل المستخدم بنجاح.' });
      }
      closeDialog();
      form.reset();
    } catch (error) {
      toast({ title: 'خطأ', description: 'لم يتم حفظ المستخدم', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getJobTitle = (jobId: string) => {
    return jobs.find(j => j.id === jobId)?.title || 'غير محدد';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">المستخدمين</h1>
          <p className="text-muted-foreground">إدارة مستخدمي النظام وربطهم بالوظائف والصلاحيات.</p>
        </div>
        <Button onClick={() => openDialog('add')} className="w-full sm:w-auto">
            <PlusCircle className="ml-2 h-4 w-4" />
            إضافة مستخدم جديد
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
                  <TableHead>الاسم الكامل</TableHead>
                  <TableHead>كود الدخول</TableHead>
                  <TableHead>الوظيفة</TableHead>
                  <TableHead>مدير نظام</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-center">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.code}</TableCell>
                      <TableCell>
                          <Badge variant="outline">{getJobTitle(user.jobId)}</Badge>
                      </TableCell>
                      <TableCell>
                          {user.isAdmin ? <Badge>نعم</Badge> : <Badge variant="secondary">لا</Badge>}
                      </TableCell>
                      <TableCell>
                          <Badge variant={user.status === 'نشط' ? 'default' : 'secondary'} className={user.status === 'نشط' ? 'bg-green-500 text-white' : ''}>
                            {user.status}
                          </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="outline" size="sm" onClick={() => openDialog('edit', user)}>
                            <Edit className="ml-2 h-4 w-4" />
                            تعديل
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      لا يوجد مستخدمون لعرضهم.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          )}
      </div>
      
       <Dialog open={dialogState.open} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent>
             <DialogHeader>
                <DialogTitle>{dialogState.mode === 'add' ? 'إضافة مستخدم جديد' : 'تعديل بيانات المستخدم'}</DialogTitle>
             </DialogHeader>
             <form onSubmit={handleSaveUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">الاسم الكامل</Label>
                  <Input id="name" name="name" defaultValue={dialogState.user?.name} required disabled={isSubmitting} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="code">كود الدخول</Label>
                        <Input id="code" name="code" defaultValue={dialogState.user?.code} required disabled={isSubmitting}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="pin">رمز المرور (PIN)</Label>
                        <Input id="pin" name="pin" type="password" placeholder={dialogState.mode === 'edit' ? 'اتركه فارغاً لعدم التغيير' : ''} required={dialogState.mode === 'add'} disabled={isSubmitting}/>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="jobId">الوظيفة</Label>
                    <Select name="jobId" required defaultValue={dialogState.user?.jobId} disabled={isSubmitting}>
                        <SelectTrigger><SelectValue placeholder="اختر وظيفة" /></SelectTrigger>
                        <SelectContent>
                            {jobs.map(job => (
                                <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Switch id="isAdmin" name="isAdmin" defaultChecked={dialogState.user?.isAdmin}/>
                    <Label htmlFor="isAdmin">منح صلاحيات مدير النظام الكاملة (Admin)</Label>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmitting}>إلغاء</Button></DialogClose>
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
