

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
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Calendar as CalendarIcon, LoaderCircle, Package, CheckCircle, Handshake, Users, DollarSign } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { addProject, listenToProjects, type Project, type Unit, batchAddUnitsToProject } from '@/services/projectsService';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';


interface UnitPrototype {
  type: string;
  area: string;
}

interface FloorPrototype {
  unitsPerFloor: string;
  unitPrototypes: UnitPrototype[];
}


export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // State for the creation form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [landArea, setLandArea] = useState('');
  const [landPricePerMeter, setLandPricePerMeter] = useState('');
  const [estimatedCosts, setEstimatedCosts] = useState('');
  const [profitMargin, setProfitMargin] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [floorCount, setFloorCount] = useState('1');
  const [floors, setFloors] = useState<FloorPrototype[]>([{ unitsPerFloor: '1', unitPrototypes: [{ type: '', area: '' }] }]);
  const [unifyFloors, setUnifyFloors] = useState(false);

  const resetFormState = () => {
    setName('');
    setDescription('');
    setLandArea('');
    setLandPricePerMeter('');
    setEstimatedCosts('');
    setProfitMargin('');
    setStartDate(new Date());
    setFloorCount('1');
    setFloors([{ unitsPerFloor: '1', unitPrototypes: [{ type: '', area: '' }] }]);
    setUnifyFloors(false);
  };
  
    useEffect(() => {
        const count = parseInt(floorCount);
        if (unifyFloors) {
            const singleFloor = floors.length > 0 ? floors[0] : { unitsPerFloor: '1', unitPrototypes: [{ type: 'شقة', area: '' }] };
            setFloors([singleFloor]);
            return;
        }

        if (!isNaN(count) && count >= 0) {
        const newFloors = Array.from({ length: count }, (_, i) => 
            floors[i] || { unitsPerFloor: '1', unitPrototypes: [{ type: 'شقة', area: '' }] }
        );
        setFloors(newFloors);
        }
    }, [floorCount, unifyFloors]);

    useEffect(() => {
        const updatedFloors = floors.map(floor => {
            const count = parseInt(floor.unitsPerFloor);
            if (!isNaN(count) && count >= 0) {
                const newPrototypes = Array.from({ length: count }, (_, i) => 
                    floor.unitPrototypes[i] || { type: 'شقة', area: '' }
                );
                if (newPrototypes.length !== floor.unitPrototypes.length) {
                return { ...floor, unitPrototypes: newPrototypes };
                }
            }
            return floor;
        });

        if (JSON.stringify(updatedFloors) !== JSON.stringify(floors)) {
            setFloors(updatedFloors);
        }
    }, [floors]);
    
  const handleFloorChange = (floorIndex: number, field: keyof FloorPrototype, value: string) => {
        setFloors(currentFloors => {
            const newFloors = [...currentFloors];
            const updatedFloor = { ...newFloors[floorIndex], [field]: value };
            newFloors[floorIndex] = updatedFloor;
    
            if (field === 'unitsPerFloor') {
                const unitsCount = parseInt(value) || 0;
                const currentPrototypes = updatedFloor.unitPrototypes;
                const newPrototypes = Array.from({ length: unitsCount }, (_, i) =>
                    currentPrototypes[i] || { type: '', area: '' }
                );
                updatedFloor.unitPrototypes = newPrototypes;
            }
            
            if (unifyFloors) {
                return Array(newFloors.length).fill(updatedFloor);
            }
    
            return newFloors;
        });
    };

    const handleUnitPrototypeChange = (floorIndex: number, unitIndex: number, field: 'type' | 'area', value: string) => {
        setFloors(currentFloors => {
            const newFloors = [...currentFloors];
            const targetFloor = { ...newFloors[floorIndex] };
            const newPrototypes = [...targetFloor.unitPrototypes];
            newPrototypes[unitIndex] = { ...newPrototypes[unitIndex], [field]: value };
            targetFloor.unitPrototypes = newPrototypes;
            newFloors[floorIndex] = targetFloor;
            
            if (unifyFloors) {
                 return Array(newFloors.length).fill(targetFloor);
            }
    
            return newFloors;
        });
    };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToProjects((projects) => {
        setProjects(projects);
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    
    if (!name || !estimatedCosts) {
      toast({title: 'خطأ', description: `الرجاء تعبئة اسم المشروع والتكاليف التقديرية.`, variant: 'destructive'});
      setIsSubmitting(false);
      return;
    }
    
    const newProjectData: Omit<Project, 'id' | 'spent' | 'status' | 'units' | 'budgetItems' | 'collectedFromSales' | 'collectedFromPartners'> = {
      name,
      description,
      landArea: parseFloat(landArea) || 0,
      landPricePerMeter: parseFloat(landPricePerMeter) || 0,
      estimatedCosts: parseFloat(estimatedCosts) || 0,
      profitMargin: parseFloat(profitMargin) || 0,
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    };
    
    const totalFloors = parseInt(floorCount) || 0;
    const newUnits: Omit<Unit, 'id'>[] = [];
    
    if (unifyFloors) {
        const prototypeFloor = floors[0];
        if (!prototypeFloor) {
            toast({title: 'خطأ', description: `الرجاء تعبئة بيانات الوحدات.`, variant: 'destructive'});
            setIsSubmitting(false);
            return;
        }
        for (let i = 0; i < totalFloors; i++) {
            for(const proto of prototypeFloor.unitPrototypes) {
                 if (!proto.type || !proto.area) {
                    toast({title: 'خطأ', description: `الرجاء تعبئة بيانات كل الوحدات في النموذج الموحد.`, variant: 'destructive'});
                    setIsSubmitting(false);
                    return;
                }
                newUnits.push({
                    type: `${proto.type} - طابق ${i + 1}`,
                    area: parseFloat(proto.area),
                    status: 'متاحة',
                    suggestedPrice: 0,
                });
            }
        }
    } else {
        for (let i = 0; i < floors.length; i++) {
            const floor = floors[i];
            for (const proto of floor.unitPrototypes) {
                if (!proto.type || !proto.area) {
                    toast({title: 'خطأ', description: `الرجاء تعبئة بيانات كل الوحدات في الطابق ${i + 1}.`, variant: 'destructive'});
                    setIsSubmitting(false);
                    return;
                }
                newUnits.push({
                    type: `${proto.type} - طابق ${i + 1}`,
                    area: parseFloat(proto.area),
                    status: 'متاحة',
                    suggestedPrice: 0,
                });
            }
        }
    }

    try {
        const createdProjectData = await addProject(newProjectData);
        if (newUnits.length > 0) {
            await batchAddUnitsToProject(createdProjectData.id, newUnits, createdProjectData);
        }
        toast({ title: 'نجاح', description: 'تمت إضافة المشروع بنجاح. سيتم الآن نقلك لإدارة تفاصيله.' });
        setOpen(false);
        resetFormState();
        router.push(`/projects/manage?id=${createdProjectData.id}`); // Redirect to manage page
    } catch (error) {
         toast({ title: 'خطأ', description: 'لم يتم إضافة المشروع. الرجاء المحاولة مرة أخرى.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const getUnitStats = (project: Project) => {
    const units = project.units ? Object.values(project.units) : [];
    return {
        total: units.length,
        available: units.filter(u => u.status === 'متاحة').length,
        booked: units.filter(u => u.status === 'محجوزة').length,
        sold: units.filter(u => u.status === 'مباعة').length,
    }
  }

  const partnerCount = (project: Project) => {
      return project.partners ? Object.keys(project.partners).length : 0;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold">المشاريع</h1>
         <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetFormState();
         }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
                <PlusCircle className="ml-2 h-4 w-4" />
                إضافة مشروع جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>إضافة مشروع جديد</DialogTitle>
              <DialogDescription>أدخل جميع المعلومات الأساسية وهيكل الوحدات للمشروع.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddProject} className="space-y-6 max-h-[80vh] overflow-y-auto p-2">
                 <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>البيانات الأساسية</AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-4">
                               <div className="space-y-2">
                                    <Label htmlFor="name">اسم المشروع</Label>
                                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: بناء فيلا سكنية" required disabled={isSubmitting} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">وصف المشروع</Label>
                                    <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="أضف وصفاً موجزاً للمشروع" disabled={isSubmitting} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                    <Label htmlFor="landArea">مساحة الأرض (م²)</Label>
                                    <Input id="landArea" value={landArea} onChange={(e) => setLandArea(e.target.value)} type="number" placeholder="600" disabled={isSubmitting} />
                                    </div>
                                    <div className="space-y-2">
                                    <Label htmlFor="landPricePerMeter">سعر المتر للأرض</Label>
                                    <Input id="landPricePerMeter" value={landPricePerMeter} onChange={(e) => setLandPricePerMeter(e.target.value)} type="number" placeholder="1500" disabled={isSubmitting} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                    <Label htmlFor="estimatedCosts">التكاليف التقديرية للمشروع (إنشاءات)</Label>
                                    <Input id="estimatedCosts" value={estimatedCosts} onChange={(e) => setEstimatedCosts(e.target.value)} type="number" placeholder="500000" required disabled={isSubmitting} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="profitMargin">هامش الربح المستهدف (%)</Label>
                                        <Input id="profitMargin" value={profitMargin} onChange={(e) => setProfitMargin(e.target.value)} type="number" placeholder="25" disabled={isSubmitting} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                        <Label>تاريخ البدء</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                variant={"outline"}
                                                disabled={isSubmitting}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !startDate && "text-muted-foreground"
                                                )}
                                                >
                                                <CalendarIcon className="ml-2 h-4 w-4" />
                                                {startDate ? format(startDate, "PPP", { locale: arSA }) : <span>اختر تاريخ</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                mode="single"
                                                selected={startDate}
                                                onSelect={(date) => setStartDate(date || new Date())}
                                                initialFocus
                                                locale={arSA}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>هيكل الوحدات</AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                <div className="space-y-2">
                                        <Label htmlFor="floorCount">إجمالي عدد الطوابق</Label>
                                        <Input id="floorCount" value={floorCount} onChange={e => setFloorCount(e.target.value)} type="number" min="0" required disabled={isSubmitting}/>
                                    </div>
                                    <div className="flex items-center space-x-2 space-x-reverse pt-6">
                                        <Switch id="unify-floors" checked={unifyFloors} onCheckedChange={setUnifyFloors} disabled={isSubmitting}/>
                                        <Label htmlFor="unify-floors">توحيد تصميم كل الطوابق</Label>
                                    </div>
                                </div>

                                {floors.length > 0 && unifyFloors && (
                                    <div className="space-y-4 pt-4 border-t">
                                        <p className="text-sm text-muted-foreground">سيتم تطبيق هذا التصميم على كل الطوابق ({floorCount}).</p>
                                        <div className="space-y-2">
                                            <Label htmlFor={`unitsPerFloor-unified`}>عدد الوحدات في كل طابق</Label>
                                            <Input 
                                                id={`unitsPerFloor-unified`}
                                                value={floors[0].unitsPerFloor}
                                                onChange={e => handleFloorChange(0, 'unitsPerFloor', e.target.value)}
                                                type="number" min="1" required disabled={isSubmitting}
                                            />
                                        </div>
                                        {floors[0].unitPrototypes.map((proto, unitIndex) => (
                                            <div key={unitIndex} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end border-t pt-3">
                                                <div className="space-y-2">
                                                    <Label htmlFor={`unitType-unified-${unitIndex}`}>نوع الوحدة {unitIndex + 1}</Label>
                                                    <Input 
                                                        id={`unitType-unified-${unitIndex}`} 
                                                        value={proto.type} 
                                                        onChange={e => handleUnitPrototypeChange(0, unitIndex, 'type', e.target.value)} 
                                                        placeholder="مثال: شقة أمامية" required disabled={isSubmitting}/>
                                                </div>
                                                    <div className="space-y-2">
                                                    <Label htmlFor={`unitArea-unified-${unitIndex}`}>المساحة (م²)</Label>
                                                    <Input 
                                                        id={`unitArea-unified-${unitIndex}`} 
                                                        value={proto.area} 
                                                        onChange={e => handleUnitPrototypeChange(0, unitIndex, 'area', e.target.value)} 
                                                        type="number" placeholder="120" required disabled={isSubmitting}/>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {floors.length > 0 && !unifyFloors && (
                                    <Accordion type="single" collapsible className="w-full">
                                    {floors.map((floor, floorIndex) => (
                                        <AccordionItem value={`floor-${floorIndex}`} key={`floor-${floorIndex}`}>
                                            <AccordionTrigger>الطابق رقم {floorIndex + 1}</AccordionTrigger>
                                            <AccordionContent className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor={`unitsPerFloor-${floorIndex}`}>عدد الوحدات في هذا الطابق</Label>
                                                    <Input 
                                                        id={`unitsPerFloor-${floorIndex}`}
                                                        value={floor.unitsPerFloor}
                                                        onChange={e => handleFloorChange(floorIndex, 'unitsPerFloor', e.target.value)}
                                                        type="number" min="1" required disabled={isSubmitting}
                                                    />
                                                </div>
                                                {floor.unitPrototypes.map((proto, unitIndex) => (
                                                    <div key={unitIndex} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end border-t pt-3">
                                                        <div className="space-y-2">
                                                            <Label htmlFor={`unitType-${floorIndex}-${unitIndex}`}>نوع الوحدة {unitIndex + 1}</Label>
                                                            <Input 
                                                                id={`unitType-${floorIndex}-${unitIndex}`} 
                                                                value={proto.type} 
                                                                onChange={e => handleUnitPrototypeChange(floorIndex, unitIndex, 'type', e.target.value)} 
                                                                placeholder="مثال: شقة أمامية" required disabled={isSubmitting}/>
                                                        </div>
                                                            <div className="space-y-2">
                                                            <Label htmlFor={`unitArea-${floorIndex}-${unitIndex}`}>المساحة (م²)</Label>
                                                            <Input 
                                                                id={`unitArea-${floorIndex}-${unitIndex}`} 
                                                                value={proto.area} 
                                                                onChange={e => handleUnitPrototypeChange(floorIndex, unitIndex, 'area', e.target.value)} 
                                                                type="number" placeholder="120" required disabled={isSubmitting}/>
                                                        </div>
                                                    </div>
                                                ))}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                    </Accordion>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                <DialogFooter className="pt-4 border-t">
                    <DialogClose asChild>
                    <Button type="button" variant="secondary" disabled={isSubmitting}>
                        إلغاء
                    </Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                    إنشاء المشروع
                    </Button>
                </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
        
        {loading ? (
             <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                <p className="mr-4">جاري تحميل المشاريع...</p>
            </div>
        ) : projects.length === 0 ? (
            <Card>
                <CardContent className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">لا توجد مشاريع لعرضها حالياً. قم بإضافة مشروع جديد.</p>
                </CardContent>
            </Card>
        ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => {
                    const stats = getUnitStats(project);
                    return (
                        <Card key={project.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="truncate">{project.name}</CardTitle>
                                    <div className="text-xs font-bold bg-muted px-2 py-1 rounded-md">{project.status}</div>
                                </div>
                                <CardDescription className="h-10 truncate">{project.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 flex-grow">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-muted-foreground">المنصرف</span>
                                        <span className="font-semibold">{project.spent.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</span>
                                    </div>
                                    <Progress value={project.estimatedCosts > 0 ? (project.spent / project.estimatedCosts) * 100 : 0} />
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">التكلفة التقديرية</span>
                                        <span>{project.estimatedCosts.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pt-4 border-t">
                                     <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-green-500" /><span>إيرادات البيع: {(project.collectedFromSales || 0).toLocaleString('ar-EG')}</span></div>
                                     <div className="flex items-center gap-2"><Handshake className="h-4 w-4 text-purple-500" /><span>تمويل الشركاء: {(project.collectedFromPartners || 0).toLocaleString('ar-EG')}</span></div>
                                     <div className="flex items-center gap-2"><Package className="h-4 w-4 text-blue-500" /><span>الوحدات المتاحة: {stats.available}/{stats.total}</span></div>
                                     <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /><span>الوحدات المباعة: {stats.sold}/{stats.total}</span></div>
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                                    <span>تاريخ البدء: {project.startDate}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-2">
                                <Button asChild variant="outline" className="w-full">
                                    <Link href={`/projects/${project.id}`}>عرض الصفحة</Link>
                                </Button>
                                <Button asChild className="w-full">
                                    <Link href={`/projects/manage?id=${project.id}`}>إدارة المشروع</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        )}
    </div>
  );
}

