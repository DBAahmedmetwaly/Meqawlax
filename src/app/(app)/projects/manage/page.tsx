

'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter
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
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Edit, LoaderCircle, ShieldOff, CheckCircle, PackageOpen, PlusCircle, Trash2, Save, X, DollarSign, Percent, Building, ArrowRight, WalletCards, Briefcase, Wrench, HardHat, Search, Handshake, Fuel, ListChecks, Info, TrendingDown, Warehouse, GitCommitHorizontal, Coins, User, Undo2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { listenToProject, updateProject, type Project, type Unit, deleteProject, type ProjectPartner, addBudgetItemToProject, deleteBudgetItemFromProject, type ProjectBudgetItem, batchAddUnitsToProject, updateProjectPartners, bookOrSellUnit, recalculatePricingByProfitMargin, listenToUnitById, payPartnerProfit, recalculatePricing, confirmSale, cancelBooking } from '@/services/projectsService';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { addCustomer as addSystemCustomer, listenToCustomers, type Customer } from '@/services/customersService';
import { listenToTreasuryAccounts, type TreasuryAccount } from '@/services/treasuryService';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { addPartner, listenToPartners, type Partner } from '@/services/partnersService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { listenToBudgetItems as listenToGlobalBudgetItems, type BudgetItem as GlobalBudgetItem } from '@/services/budgetingService';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { listenToItems, type Item } from '@/services/inventoryService';
import { withdrawFromInventory } from '@/services/expensesService';


interface SaleFormData {
    customerId: string;
    actualPrice: number;
    paidAmount: number;
    installmentCount: number;
    installmentFrequency: 'monthly' | 'quarterly' | 'yearly';
}

interface UnitPrototype {
  type: string;
  area: string;
}

interface FloorPrototype {
  unitsPerFloor: string;
  unitPrototypes: UnitPrototype[];
}

function ManageProjectPageComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get('id');

  const [project, setProject] = useState<Project | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [globalBudgetItems, setGlobalBudgetItems] = useState<GlobalBudgetItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const [saleDialogState, setSaleDialogState] = useState<{open: boolean, unit: (Unit & {id: string}) | null}>({open: false, unit: null});
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [editUnitDialogState, setEditUnitDialogState] = useState<{open: boolean, unit: (Unit & {id: string}) | null}>({open: false, unit: null});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  
  const [filters, setFilters] = useState({ searchTerm: '', status: '', unitId: '' });
  
  const [saleFormData, setSaleFormData] = useState<SaleFormData>({
      customerId: '',
      actualPrice: 0,
      paidAmount: 0,
      installmentCount: 0,
      installmentFrequency: 'monthly',
  });
  
  const [editProjectDialogOpen, setEditProjectDialogOpen] = useState(false);
  const [isSubmittingProjectEdit, setIsSubmittingProjectEdit] = useState(false);
  
  const [floorCount, setFloorCount] = useState('0');
  const [floors, setFloors] = useState<FloorPrototype[]>([]);
  const [unifyFloors, setUnifyFloors] = useState(false);

  const [managePartnersOpen, setManagePartnersOpen] = useState(false);
  const [projectPartners, setProjectPartners] = useState<ProjectPartner[]>([]);
  const [isSubmittingPartners, setIsSubmittingPartners] = useState(false);
  const [addPartnerDialogOpen, setAddPartnerDialogOpen] = useState(false);
  const [isSubmittingNewPartner, setIsSubmittingNewPartner] = useState(false);
  
  const [payProfitDialogState, setPayProfitDialogState] = useState<{ open: boolean, partner: ProjectPartner | null }>({ open: false, partner: null });
  const [isSubmittingProfitPayment, setIsSubmittingProfitPayment] = useState(false);

  const [fundingDialogState, setFundingDialogState] = useState<{ open: boolean, partner: ProjectPartner | null }>({ open: false, partner: null });
  const [isSubmittingFunding, setIsSubmittingFunding] = useState(false);

  const [manageBudgetOpen, setManageBudgetOpen] = useState(false);
  const [addBudgetItemOpen, setAddBudgetItemOpen] = useState(false);
  const [selectedGlobalBudgetItemId, setSelectedGlobalBudgetItemId] = useState('');
  const [newBudgetItemAmount, setNewBudgetItemAmount] = useState('');
  const [isSubmittingBudgetItem, setIsSubmittingBudgetItem] = useState(false);
  
  const [avgPricePerMeter, setAvgPricePerMeter] = useState(0);
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  
  const [profitMargin, setProfitMargin] = useState(0);
  const [isSavingProfitMargin, setIsSavingProfitMargin] = useState(false);

  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

  const [addCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);
  const [isSubmittingNewCustomer, setIsSubmittingNewCustomer] = useState(false);


  const remainingAmount = useMemo(() => {
      const price = saleFormData.actualPrice || 0;
      const paid = saleFormData.paidAmount || 0;
      return price > paid ? price - paid : 0;
  }, [saleFormData.actualPrice, saleFormData.paidAmount]);
  
  const projectFund = useMemo(() => {
    if (!project || !project.treasuryAccountId) return null;
    return accounts.find(acc => acc.id === project.treasuryAccountId);
  }, [project, accounts]);
  
   const projectedProfit = useMemo(() => {
      if(!project) return 0;
      return (project.collectedFromSales || 0) - project.spent;
   }, [project]);


  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribeProject = listenToProject(projectId, (projectData) => {
      setProject(projectData);
      if (projectData) {
        setProjectPartners(projectData?.partners ? Object.values(projectData.partners) : []);
        setProfitMargin(projectData.profitMargin || 0);
      }
      setLoading(false);
    });
    
    const unsubscribeCustomers = listenToCustomers(setCustomers);
    const unsubscribeAccounts = listenToTreasuryAccounts(setAccounts);
    const unsubscribePartners = listenToPartners(setPartners);
    const unsubscribeGlobalBudgetItems = listenToGlobalBudgetItems(setGlobalBudgetItems);
    const unsubscribeInventoryItems = listenToItems(setInventoryItems);

    return () => {
        unsubscribeProject();
        unsubscribeCustomers();
        unsubscribeAccounts();
        unsubscribePartners();
        unsubscribeGlobalBudgetItems();
        unsubscribeInventoryItems();
    };
  }, [projectId]);

  const allUnitsArray = useMemo(() => {
    if (!project || !project.units) return [];
    return Object.entries(project.units).map(([id, u]) => {
      const floorMatch = u.type.match(/طابق (\d+)/);
      const floor = floorMatch ? parseInt(floorMatch[1], 10) : 0;
      return { ...u, id, floor };
    });
  }, [project]);
  
  const maquetteData = useMemo(() => {
    const floors: { [floor: number]: (Unit & {id: string, floor: number})[] } = {};
    allUnitsArray.forEach(unit => {
        if (!floors[unit.floor]) {
            floors[unit.floor] = [];
        }
        floors[unit.floor].push(unit);
    });
    return Object.entries(floors).sort(([a], [b]) => Number(a) - Number(b));
  }, [allUnitsArray]);

  const totalEstimatedCost = useMemo(() => {
    if (!project) return 0;
    const landCost = (project.landArea || 0) * (project.landPricePerMeter || 0);
    return (project.estimatedCosts || 0) + landCost;
  }, [project]);

  const requiredRevenue = useMemo(() => {
    if (!project) return 0;
    return totalEstimatedCost * (1 + (profitMargin || 0) / 100);
  }, [project, totalEstimatedCost, profitMargin]);
  
  useEffect(() => {
      if (project && allUnitsArray.length > 0) {
        const totalArea = allUnitsArray.reduce((acc, u) => acc + u.area, 0);
        const landCost = (project.landArea || 0) * (project.landPricePerMeter || 0);
        const totalCost = (project.estimatedCosts || 0) + landCost;
        const requiredRevenueValue = totalCost * (1 + (profitMargin || 0) / 100);
        const avgPrice = totalArea > 0 ? requiredRevenueValue / totalArea : 0;
        setAvgPricePerMeter(avgPrice);
      }
  }, [project, allUnitsArray, profitMargin]);

  const filteredUnits = useMemo(() => {
    if (!project) return [];

    return allUnitsArray.filter(unit => {
        if (filters.unitId) {
            return unit.id === filters.unitId;
        }
        const matchesSearch = unit.type.toLowerCase().includes(filters.searchTerm.toLowerCase());
        const matchesStatus = !filters.status || unit.status === filters.status;
        return matchesSearch && matchesStatus;
    });
    
  }, [project, allUnitsArray, filters]);
  
  const { minArea, maxArea } = useMemo(() => {
    if (allUnitsArray.length === 0) return { minArea: 0, maxArea: 0 };
    const areas = allUnitsArray.map(u => u.area);
    return {
        minArea: Math.min(...areas),
        maxArea: Math.max(...areas),
    }
  }, [allUnitsArray]);

  const getUnitFlexBasis = (area: number) => {
    if (maxArea === minArea || maxArea === 0) return '120px';
    const minBasis = 120;
    const maxBasis = 240;
    const basis = minBasis + ((area - minArea) / (maxArea - minArea)) * (maxBasis - minBasis);
    return `${basis}px`;
  };

  const openSaleDialog = (unit: (Unit & {id: string})) => {
      setSaleFormData({
          customerId: '',
          actualPrice: unit.suggestedPrice || 0,
          paidAmount: 0,
          installmentCount: 0,
          installmentFrequency: 'monthly',
      });
      setSaleDialogState({open: true, unit});
  }
  const closeSaleDialog = () => setSaleDialogState({open: false, unit: null});

  const openEditUnitDialog = (unit: (Unit & {id: string})) => setEditUnitDialogState({open: true, unit});
  const closeEditUnitDialog = () => setEditUnitDialogState({open: false, unit: null});

  const handleStatusChange = async (status: Project['status']) => {
    if (!projectId) return;
    try {
      await updateProject(projectId, { status });
      toast({
        title: 'نجاح',
        description: `تم تحديث حالة المشروع بنجاح إلى "${status}".`,
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'لم يتم تحديث حالة المشروع.',
        variant: 'destructive',
      });
    }
  };
  
  const handleEditUnit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if(!projectId || !editUnitDialogState.unit) return;
    setIsSubmittingEdit(true);
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as string;
    const area = parseFloat(formData.get('area') as string);
    const notes = formData.get('notes') as string;
    
    if(!type || !area) {
        toast({ title: "خطأ", description: "الرجاء تعبئة جميع الحقول.", variant: "destructive" });
        setIsSubmittingEdit(false);
        return;
    }

    try {
        await updateProject(projectId, { 
            [`units/${editUnitDialogState.unit.id}/type`]: type,
            [`units/${editUnitDialogState.unit.id}/area`]: area,
            [`units/${editUnitDialogState.unit.id}/notes`]: notes,
        });
        toast({title: 'نجاح', description: 'تم تعديل الوحدة بنجاح.'});
        closeEditUnitDialog();
    } catch (err) {
        toast({title: 'خطأ', description: 'لم يتم تعديل الوحدة.', variant: 'destructive'});
    } finally {
        setIsSubmittingEdit(false);
    }
  }

  const handleDeleteProject = async () => {
    if (!projectId) return;
    try {
      await deleteProject(projectId);
      toast({ title: 'نجاح', description: 'تم حذف المشروع بنجاح.' });
      router.push('/projects');
    } catch (error) {
      toast({ title: 'خطأ', description: 'لم يتم حذف المشروع.', variant: 'destructive' });
    }
  };

  const handleBookOrSell = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!projectId || !project || !saleDialogState.unit) return;
    setIsSubmittingSale(true);

    const formData = new FormData(e.currentTarget);
    const customerId = saleFormData.customerId; 
    const actualPrice = parseFloat(formData.get('actualPrice') as string);
    const paidAmount = parseFloat(formData.get('paidAmount') as string) || 0;
    const status = formData.get('status') as Unit['status'];
    const installmentCount = parseInt(formData.get('installmentCount') as string) || 0;
    const installmentFrequency = formData.get('installmentFrequency') as 'monthly' | 'quarterly' | 'yearly';
    
    const customer = customers.find(c => c.id === customerId);
    
    if(!customer || !actualPrice || !status || !projectFund) {
        toast({ title: 'خطأ', description: 'يرجى تعبئة جميع الحقول المطلوبة (العميل، السعر، الحالة، وصندوق المشروع).', variant: 'destructive'});
        setIsSubmittingSale(false);
        return;
    }
    
    if (installmentCount > 0 && remainingAmount <= 0) {
        toast({ title: 'خطأ', description: 'لا يمكن إنشاء أقساط إذا تم سداد المبلغ بالكامل.', variant: 'destructive'});
        setIsSubmittingSale(false);
        return;
    }
    if (installmentCount <= 0 && remainingAmount > 0) {
        toast({ title: 'خطأ', description: 'يجب تحديد عدد الأقساط للمبلغ المتبقي.', variant: 'destructive'});
        setIsSubmittingSale(false);
        return;
    }


    try {
        await bookOrSellUnit({
            projectId,
            projectName: project.name,
            unitId: saleDialogState.unit.id,
            unitType: saleDialogState.unit.type,
            customerId,
            customerName: customer.name,
            actualPrice,
            paidAmount,
            newStatus: status,
            accountId: projectFund.id,
            accountName: projectFund.name,
            installmentOptions: installmentCount > 0 ? {
                count: installmentCount,
                frequency: installmentFrequency,
                remainingAmount: remainingAmount,
            } : undefined
        });
        toast({ title: 'نجاح', description: `تم ${status === 'محجوزة' ? 'حجز' : 'بيع'} الوحدة بنجاح.`});
        closeSaleDialog();
    } catch(error) {
        console.error(error);
        toast({ title: 'خطأ', description: 'فشلت عملية البيع أو الحجز.', variant: 'destructive'});
    } finally {
        setIsSubmittingSale(false);
    }
  }

  const handleConfirmSale = async (unit: Unit & {id: string}) => {
    if (!projectId) return;
    try {
        await confirmSale(projectId, unit.id);
        toast({title: "نجاح", description: "تم تأكيد بيع الوحدة بنجاح."});
    } catch(error) {
        console.error(error);
        toast({title: "خطأ", description: "فشل تأكيد البيع.", variant: "destructive"});
    }
  }
  
  const handleCancelBooking = async (unit: Unit & {id: string}) => {
    if (!projectId || !projectFund || !unit.customerId) return;
    try {
        await cancelBooking({
            projectId,
            unitId: unit.id,
            customerId: unit.customerId,
            paidAmount: unit.paidAmount || 0,
            projectFundId: projectFund.id
        });
        toast({title: "نجاح", description: "تم إلغاء حجز الوحدة بنجاح."});
    } catch(error) {
        console.error(error);
        toast({title: "خطأ", description: "فشل إلغاء الحجز.", variant: "destructive"});
    }
  }

  const handleEditProjectSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!projectId || !project) return;
    setIsSubmittingProjectEdit(true);

    const formData = new FormData(e.currentTarget);
    const updatedData = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        landArea: parseFloat(formData.get('landArea') as string) || 0,
        landPricePerMeter: parseFloat(formData.get('landPricePerMeter') as string) || 0,
        estimatedCosts: parseFloat(formData.get('estimatedCosts') as string) || 0,
        profitMargin: parseFloat(formData.get('profitMargin') as string) || 0,
    };
    
    const totalFloors = parseInt(floorCount) || 0;
    const newUnits: Omit<Unit, 'id'>[] = [];
    
    if (unifyFloors) {
        const prototypeFloor = floors[0];
        if (!prototypeFloor) {
            toast({title: 'خطأ', description: `الرجاء تعبئة بيانات الوحدات.`, variant: 'destructive'});
            setIsSubmittingProjectEdit(false);
            return;
        }
        for (let i = 0; i < totalFloors; i++) {
            for(const proto of prototypeFloor.unitPrototypes) {
                 if (!proto.type || !proto.area) {
                    toast({title: 'خطأ', description: `الرجاء تعبئة بيانات كل الوحدات في النموذج الموحد.`, variant: 'destructive'});
                    setIsSubmittingProjectEdit(false);
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
                    setIsSubmittingProjectEdit(false);
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
        await updateProject(projectId, updatedData);
        if (newUnits.length > 0) {
            await batchAddUnitsToProject(projectId, newUnits, { ...project, ...updatedData });
        }
        toast({title: "نجاح", description: "تم تحديث بيانات المشروع وهيكل الوحدات بنجاح."});
        setEditProjectDialogOpen(false);
    } catch (error) {
        console.error(error);
        toast({title: "خطأ", description: "فشل تحديث المشروع.", variant: "destructive"});
    } finally {
        setIsSubmittingProjectEdit(false);
    }
  };

  const getStatusBadge = (status: Project['status']) => {
    const statusClasses = {
      'نشط': "bg-green-500 text-white",
      'مكتمل': "bg-gray-500 text-white",
      'مجمد': "bg-red-500 text-white",
      'متأخر': "bg-orange-500 text-white",
    };
    return <Badge variant="default" className={cn("whitespace-nowrap", statusClasses[status] || 'bg-blue-500')}>{status}</Badge>;
  };
  
    const floorColors = [
        'bg-blue-100 border-blue-300',
        'bg-purple-100 border-purple-300',
        'bg-pink-100 border-pink-300',
        'bg-teal-100 border-teal-300',
        'bg-cyan-100 border-cyan-300',
    ];

    const getUnitStatusColor = (status: Unit['status'], floor: number) => {
        const floorColorClass = floorColors[floor % floorColors.length];
        switch(status) {
            case 'متاحة': return `${floorColorClass} text-green-800`;
            case 'محجوزة': return `${floorColorClass} text-yellow-800 opacity-80`;
            case 'مباعة': return `bg-gray-200 border-gray-400 text-gray-800 opacity-60`;
            default: return 'bg-gray-100 border-gray-300 text-gray-800';
        }
    }
    
    useEffect(() => {
        if (project) {
            const floorStructure: { [key: number]: UnitPrototype[] } = {};
            const availableUnits = allUnitsArray.filter(u => u.status === 'متاحة');
            
            availableUnits.forEach(unit => {
                if (!floorStructure[unit.floor]) {
                    floorStructure[unit.floor] = [];
                }
                const typeMatch = unit.type.match(/(.*?) - طابق \d+/);
                const baseType = typeMatch ? typeMatch[1] : unit.type;
                floorStructure[unit.floor].push({ type: baseType, area: String(unit.area) });
            });
            
            const floorsArray = Object.entries(floorStructure).map(([floorNum, unitProtos]) => {
                return {
                    unitsPerFloor: String(unitProtos.length),
                    unitPrototypes: unitProtos
                }
            }).sort((a,b) => parseInt(Object.keys(floorStructure)[0]) - parseInt(Object.keys(floorStructure)[1]));
            
            setFloorCount(String(Object.keys(floorStructure).length || 1));
            setFloors(floorsArray.length > 0 ? floorsArray : [{ unitsPerFloor: '1', unitPrototypes: [{ type: 'شقة', area: '' }] }]);
        }
    }, [project, allUnitsArray, editProjectDialogOpen]);

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

    const availablePartnersForProject = useMemo(() => {
        return partners.filter(p => !projectPartners.some(pp => pp.id === p.id));
    }, [partners, projectPartners]);

    const handleAddPartnerToProject = () => {
        setProjectPartners([...projectPartners, { id: '', name: '', landInvestment: 0, buildingInvestment: 0, profitShare: 0 }]);
    };

    const handleRemovePartnerFromProject = (index: number) => {
        setProjectPartners(projectPartners.filter((_, i) => i !== index));
    };
    
    const handlePartnerChange = (index: number, field: keyof ProjectPartner, value: string | number) => {
        const newPartners = [...projectPartners];
        const partnerData = partners.find(p => p.id === value);
        
        if (field === 'id' && partnerData) {
            newPartners[index] = { ...newPartners[index], id: partnerData.id, name: partnerData.name };
        } else if (field === 'landInvestment' || field === 'buildingInvestment') {
            newPartners[index] = { ...newPartners[index], [field]: Number(value) || 0 };
        }
        
        const totalLandInvestment = newPartners.reduce((acc, p) => acc + (p.landInvestment || 0), 0);
        const totalBuildingInvestment = newPartners.reduce((acc, p) => acc + (p.buildingInvestment || 0), 0);
        const totalInvestment = totalLandInvestment + totalBuildingInvestment;

        const finalPartners = newPartners.map(p => {
            if (totalInvestment > 0) {
                const partnerTotal = (p.landInvestment || 0) + (p.buildingInvestment || 0);
                const profitShare = parseFloat(((partnerTotal / totalInvestment) * 100).toFixed(2));
                return { ...p, profitShare: isNaN(profitShare) ? 0 : profitShare };
            }
            return { ...p, profitShare: 0 };
        });
        
        setProjectPartners(finalPartners);
    };

    const handleSavePartners = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!projectId || !project || !project.treasuryAccountId) return;
        setIsSubmittingPartners(true);
        
        const formData = new FormData(e.currentTarget);
        const fundingSourceAccountId = formData.get('fundingSourceAccountId') as string | undefined;

        const totalProfitShare = projectPartners.reduce((acc, p) => acc + Number(p.profitShare), 0);
        if (totalProfitShare > 100.01) {
            toast({ title: 'خطأ', description: 'مجموع نسب أرباح الشركاء يتجاوز 100%.', variant: 'destructive' });
            setIsSubmittingPartners(false);
            return;
        }

        const partnersMap: { [key: string]: ProjectPartner } = {};
        for(const partner of projectPartners) {
            if (partner.id) {
                 partnersMap[partner.id] = partner;
            }
        }
        
        try {
            await updateProjectPartners({
                projectId,
                projectName: project.name,
                newPartnersMap: partnersMap,
                fundingSourceAccountId: fundingSourceAccountId || null,
                projectFundId: project.treasuryAccountId,
            });
            toast({ title: 'نجاح', description: 'تم حفظ بيانات الشركاء وتحديث التمويل بنجاح.' });
            setManagePartnersOpen(false);
        } catch (error: any) {
            toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmittingPartners(false);
        }
    };
    
      const handleAddSystemPartner = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmittingNewPartner(true);
        const form = event.currentTarget;
        const formData = new FormData(form);
        const name = formData.get('name') as string;
        const initialInvestment = parseFloat(formData.get('initialInvestment') as string) || 0;
        
        if (!name) {
            toast({ title: "خطأ", description: 'الرجاء إدخال اسم الشريك.', variant: 'destructive'});
            setIsSubmittingNewPartner(false);
            return;
        }

        try {
            await addPartner({ name, totalInvestment: initialInvestment });
            toast({ title: "نجاح", description: `تمت إضافة الشريك ${name} إلى النظام بنجاح.` });
            setAddPartnerDialogOpen(false);
            form.reset();
        } catch (error) {
            toast({ title: "خطأ", description: 'لم يتم إضافة الشريك', variant: 'destructive'});
        } finally {
            setIsSubmittingNewPartner(false);
        }
    }

    const handleAddBudgetItemToProjectSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!projectId || !selectedGlobalBudgetItemId || !newBudgetItemAmount) {
            toast({ title: 'خطأ', description: 'الرجاء اختيار بند وتحديد المبلغ المخصص.', variant: 'destructive' });
            return;
        }
        setIsSubmittingBudgetItem(true);
        
        const globalItem = globalBudgetItems.find(item => item.id === selectedGlobalBudgetItemId);
        if (!globalItem) {
            toast({ title: 'خطأ', description: 'البند المختار غير صالح.', variant: 'destructive' });
            setIsSubmittingBudgetItem(false);
            return;
        }

        try {
            await addBudgetItemToProject(projectId, {
                globalBudgetItemId: globalItem.id,
                name: globalItem.name,
                allocatedAmount: parseFloat(newBudgetItemAmount),
            });
            toast({ title: 'نجاح', description: 'تمت إضافة بند الموازنة للمشروع بنجاح.' });
            setSelectedGlobalBudgetItemId('');
            setNewBudgetItemAmount('');
            setAddBudgetItemOpen(false);
        } catch (error) {
            toast({ title: 'خطأ', description: 'فشل إضافة بند الموازنة.', variant: 'destructive' });
        } finally {
            setIsSubmittingBudgetItem(false);
        }
    };

    const handleDeleteBudgetItem = async (budgetItemId: string) => {
        if (!projectId) return;
        if (window.confirm('هل أنت متأكد من حذف هذا البند من المشروع؟')) {
            try {
                await deleteBudgetItemFromProject(projectId, budgetItemId);
                toast({ title: 'نجاح', description: 'تم حذف بند الموازنة من المشروع.' });
            } catch (error) {
                toast({ title: 'خطأ', description: 'فشل حذف بند الموازنة.', variant: 'destructive' });
            }
        }
    };
    
    const handleRecalculateByAvgPrice = async () => {
        if (!projectId || avgPricePerMeter <= 0) {
            toast({ title: "خطأ", description: "الرجاء إدخال متوسط سعر متر صالح.", variant: "destructive" });
            return;
        }
        setIsSavingPrice(true);
        try {
            await recalculatePricing(projectId, avgPricePerMeter);
            toast({ title: "نجاح", description: "تمت إعادة تسعير المشروع بنجاح." });
        } catch (error) {
            console.error(error);
            toast({ title: "خطأ", description: "فشلت عملية إعادة التسعير.", variant: "destructive" });
        } finally {
            setIsSavingPrice(false);
        }
    };
    
    const handleRecalculateByProfitMargin = async () => {
        if (!projectId || profitMargin < 0) {
            toast({ title: "خطأ", description: "الرجاء إدخال هامش ربح صالح.", variant: "destructive" });
            return;
        }
        setIsSavingProfitMargin(true);
        try {
            await recalculatePricingByProfitMargin(projectId, profitMargin);
            toast({ title: "نجاح", description: "تمت إعادة تسعير المشروع بنجاح." });
        } catch (error) {
            console.error(error);
            toast({ title: "خطأ", description: "فشلت عملية إعادة التسعير.", variant: "destructive" });
        } finally {
            setIsSavingProfitMargin(false);
        }
    };
    
    const totalAllocatedBudget = useMemo(() => {
        if (!project || !project.budgetItems) return 0;
        return Object.values(project.budgetItems).reduce((sum, item) => sum + item.allocatedAmount, 0);
    }, [project]);
    
    const availableGlobalBudgetItems = useMemo(() => {
        if (!project || !project.budgetItems) return globalBudgetItems;
        const projectItemIds = Object.values(project.budgetItems).map(item => item.globalBudgetItemId);
        return globalBudgetItems.filter(item => !projectItemIds.includes(item.id));
    }, [globalBudgetItems, project]);
    
    const handleWithdrawalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!projectId) return;
        setIsSubmittingWithdrawal(true);
        const formData = new FormData(e.currentTarget);
        const itemId = formData.get('itemId') as string;
        const quantity = parseFloat(formData.get('quantity') as string);
        const budgetItemId = formData.get('budgetItemId') as string;
        
        const item = inventoryItems.find(i => i.id === itemId);
        const budgetItem = project?.budgetItems?.[budgetItemId];

        if (!item || !quantity || !budgetItem) {
            toast({ title: "خطأ", description: "الرجاء تعبئة جميع الحقول المطلوبة.", variant: "destructive"});
            setIsSubmittingWithdrawal(false);
            return;
        }
        
        try {
            await withdrawFromInventory({
                projectId,
                item,
                quantity,
                budgetItemId,
                budgetItemName: budgetItem.name,
            });
            toast({ title: "نجاح", description: `تم صرف ${quantity} ${item.unit} من ${item.name} بنجاح.`});
            setWithdrawalDialogOpen(false);
        } catch(error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "فشلت عملية الصرف من المخزون.";
            toast({ title: "خطأ", description: errorMessage, variant: "destructive"});
        } finally {
            setIsSubmittingWithdrawal(false);
        }
    }
    
    const handlePayProfit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!projectId || !project || !payProfitDialogState.partner || !projectFund) return;
        
        setIsSubmittingProfitPayment(true);
        const formData = new FormData(e.currentTarget);
        const amount = parseFloat(formData.get('amount') as string);
        
        if (!amount || amount <= 0) {
            toast({ title: "خطأ", description: "الرجاء إدخال مبلغ صالح.", variant: "destructive" });
            setIsSubmittingProfitPayment(false);
            return;
        }
        if (amount > projectedProfit) {
             toast({ title: "خطأ", description: "مبلغ الصرف يتجاوز الربح المحقق.", variant: "destructive" });
            setIsSubmittingProfitPayment(false);
            return;
        }
        if (amount > projectFund.balance) {
             toast({ title: "خطأ", description: "رصيد صندوق المشروع غير كاف.", variant: "destructive" });
            setIsSubmittingProfitPayment(false);
            return;
        }

        try {
            await payPartnerProfit({
                projectId,
                projectName: project.name,
                partnerId: payProfitDialogState.partner.id,
                partnerName: payProfitDialogState.partner.name,
                amount,
                projectFundId: project.treasuryAccountId!,
                projectFundName: projectFund.name,
            });
            toast({ title: "نجاح", description: "تم صرف أرباح الشريك بنجاح."});
            setPayProfitDialogState({ open: false, partner: null });
        } catch (error) {
             console.error(error);
            const errorMessage = error instanceof Error ? error.message : "فشلت عملية صرف الأرباح.";
            toast({ title: "خطأ", description: errorMessage, variant: "destructive"});
        } finally {
            setIsSubmittingProfitPayment(false);
        }
    }

    const handleAddQuickCustomer = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmittingNewCustomer(true);
        const form = event.currentTarget;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        const initialBalance = (form.elements.namedItem('initialBalance') as HTMLInputElement).value;
        if (!name) {
            toast({title: "خطأ", description: "اسم العميل مطلوب.", variant: "destructive"});
            setIsSubmittingNewCustomer(false);
            return;
        }
        try {
            await addSystemCustomer({
                name, 
                balance: parseFloat(initialBalance) || 0,
                status: 'مستحق'
            });
            toast({title: "نجاح", description: `تمت إضافة العميل "${name}" بنجاح.`});
            setAddCustomerDialogOpen(false);
            form.reset();
        } catch (error) {
            toast({title: "خطأ", description: "فشلت إضافة العميل.", variant: "destructive"});
        } finally {
            setIsSubmittingNewCustomer(false);
        }
      }


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        <p className="mr-4">جاري تحميل بيانات إدارة المشروع...</p>
      </div>
    );
  }

  if (!project) {
    return (
        <div className="text-center p-8 flex flex-col items-center justify-center h-full">
            <HardHat className="h-16 w-16 text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold">لا يوجد مشروع محدد</h1>
            <p className="text-muted-foreground mt-2">
                الرجاء الذهاب إلى صفحة عرض المشاريع واختيار مشروع لعرض تفاصيله وإدارته.
            </p>
            <Button asChild className="mt-6">
                <Link href="/projects">
                    <ArrowRight className="ml-2 h-4 w-4" />
                    الانتقال إلى عرض المشاريع
                </Link>
            </Button>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground max-w-2xl">{project.description}</p>
        </div>
        <div className="flex items-center gap-2">
            {getStatusBadge(project.status)}
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setEditProjectDialogOpen(true)}>
                        <Edit className="ml-2 h-4 w-4"/>
                        <span>تعديل بيانات المشروع</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setManagePartnersOpen(true)}>
                        <Handshake className="ml-2 h-4 w-4"/>
                        <span>إدارة الشركاء</span>
                    </DropdownMenuItem>
                     <DropdownMenuItem onSelect={() => setManageBudgetOpen(true)}>
                        <ListChecks className="ml-2 h-4 w-4"/>
                        <span>إدارة بنود الموازنة</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setWithdrawalDialogOpen(true)}>
                        <Warehouse className="ml-2 h-4 w-4" />
                        <span>صرف من المخزون</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator/>
                    <DropdownMenuItem onClick={() => handleStatusChange('نشط')}><PackageOpen className="ml-2 h-4 w-4"/>نشط</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange('مجمد')}><ShieldOff className="ml-2 h-4 w-4"/>مجمد</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange('مكتمل')}><CheckCircle className="ml-2 h-4 w-4"/>مكتمل</DropdownMenuItem>
                    <DropdownMenuSeparator/>
                     <DropdownMenuItem onClick={() => router.push(`/projects/${projectId}`)}>
                        <ArrowRight className="ml-2 h-4 w-4"/>
                        <span>الانتقال لصفحة المشروع</span>
                     </DropdownMenuItem>
                    <DropdownMenuSeparator/>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                <Trash2 className="ml-2 h-4 w-4"/>
                                <span>حذف المشروع</span>
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد من حذف المشروع؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    لا يمكن التراجع عن هذا الإجراء. سيؤدي هذا إلى حذف المشروع وجميع الوحدات والمصروفات المرتبطة به بشكل دائم.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive hover:bg-destructive/90">
                                    نعم، قم بالحذف
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      
       <Card>
        <CardHeader>
          <CardTitle>تحليل الربحية</CardTitle>
          <CardDescription>نظرة عامة على الأرقام الرئيسية للمشروع بناءً على التكاليف وهامش الربح.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 text-center">
            <div className="p-4 bg-muted rounded-lg break-words">
                <DollarSign className="mx-auto h-8 w-8 text-muted-foreground mb-2"/>
                <h4 className="text-sm font-semibold">إجمالي التكاليف التقديرية</h4>
                <p className="text-lg md:text-xl font-bold font-mono">{totalEstimatedCost.toLocaleString('ar-EG', {style: 'currency', currency: 'EGP'})}</p>
            </div>
             <div className="p-4 bg-muted rounded-lg break-words">
                <TrendingDown className="mx-auto h-8 w-8 text-destructive mb-2"/>
                <h4 className="text-sm font-semibold">إجمالي المصروفات الفعلية</h4>
                <p className="text-lg md:text-xl font-bold font-mono text-negative">{project.spent.toLocaleString('ar-EG', {style: 'currency', currency: 'EGP'})}</p>
            </div>
             <div className="p-4 bg-muted rounded-lg break-words">
                <Percent className="mx-auto h-8 w-8 text-muted-foreground mb-2"/>
                <h4 className="text-sm font-semibold">هامش الربح المستهدف</h4>
                 <div className="flex justify-center items-center gap-2 mt-1">
                    <Input
                        type="number"
                        value={profitMargin.toString()}
                        onChange={(e) => setProfitMargin(parseFloat(e.target.value) || 0)}
                        className="text-lg md:text-xl font-bold font-mono text-blue-600 p-1 h-12 text-center"
                        disabled={isSavingProfitMargin}
                    />
                    <Button size="icon" onClick={handleRecalculateByProfitMargin} disabled={isSavingProfitMargin}>
                        {isSavingProfitMargin ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
                    </Button>
                </div>
            </div>
             <div className="p-4 bg-muted rounded-lg break-words">
                <DollarSign className="mx-auto h-8 w-8 text-green-500 mb-2"/>
                <h4 className="text-sm font-semibold">الإيرادات المطلوبة</h4>
                <p className="text-lg md:text-xl font-bold font-mono text-green-600">{requiredRevenue.toLocaleString('ar-EG', {style: 'currency', currency: 'EGP'})}</p>
            </div>
             <div className="p-4 bg-muted rounded-lg break-words">
                <Building className="mx-auto h-8 w-8 text-blue-500 mb-2"/>
                <h4 className="text-sm font-semibold">متوسط سعر المتر</h4>
                <div className="flex justify-center items-center gap-2 mt-1">
                    <Input
                        type="number"
                        value={avgPricePerMeter.toFixed(0)}
                        onChange={(e) => setAvgPricePerMeter(parseFloat(e.target.value) || 0)}
                        className="text-lg md:text-xl font-bold font-mono text-blue-600 p-1 h-12 text-center"
                        disabled={isSavingPrice}
                    />
                     <Button size="icon" onClick={handleRecalculateByAvgPrice} disabled={isSavingPrice}>
                        {isSavingPrice ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
                    </Button>
                </div>
            </div>
        </CardContent>
      </Card>
      
       {allUnitsArray.length > 0 && (
         <Card>
            <CardHeader>
                <CardTitle>ماكيت المشروع (تمثيل بصري)</CardTitle>
                <CardDescription>عرض للوحدات بناءً على مساحتها وحالتها ولون طابقها. انقر على أي وحدة لفلترة الجدول أدناه.</CardDescription>
            </CardHeader>
            <CardContent>
                <TooltipProvider>
                    <div className="overflow-x-auto">
                        <div className="flex flex-col gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-md border w-fit min-w-full">
                            {maquetteData.map(([floor, units]) => (
                                <div key={`floor-${floor}`} className="space-y-2">
                                     <h4 className="font-semibold text-sm text-muted-foreground">
                                        {Number(floor) === 0 ? 'الطابق الأرضي' : `الطابق ${floor}`}
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {units.map(unit => {
                                            const customerName = unit.customerId ? customers.find(c => c.id === unit.customerId)?.name : '';
                                            return (
                                            <Tooltip key={unit.id} delayDuration={100}>
                                                <TooltipTrigger asChild>
                                                    <div
                                                        className={cn(
                                                            'p-3 rounded-md border transition-all cursor-pointer hover:shadow-md flex flex-col justify-between', 
                                                            getUnitStatusColor(unit.status, unit.floor)
                                                        )}
                                                        style={{ flexBasis: getUnitFlexBasis(unit.area), flexGrow: 1 }}
                                                        onClick={() => setFilters(prev => ({ ...prev, unitId: prev.unitId === unit.id ? '' : unit.id }))}
                                                        >
                                                        <div className="space-y-1">
                                                            <p className="font-bold text-sm">{unit.type}</p>
                                                            <p className="text-xs">{unit.area} م²</p>
                                                            <p className="text-xs font-mono text-positive font-semibold">
                                                                {(unit.suggestedPrice || 0).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0 })}
                                                            </p>
                                                            {customerName && <p className="text-xs text-blue-600 font-bold mt-1 truncate">{customerName}</p>}
                                                        </div>
                                                        <Badge variant="outline" className="mt-2 bg-white/70 w-fit">{unit.status}</Badge>
                                                    </div>
                                                </TooltipTrigger>
                                                {unit.notes && (
                                                    <TooltipContent>
                                                        <p>{unit.notes}</p>
                                                    </TooltipContent>
                                                )}
                                            </Tooltip>
                                        )})}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </TooltipProvider>
                 <div className="flex flex-wrap gap-4 mt-4 text-xs">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-green-100 border border-green-300"></div><span>متاحة</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-300"></div><span>محجوزة</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-gray-200 border border-gray-400"></div><span>مباعة</span></div>
                </div>
            </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
                 <CardTitle>وحدات المشروع وتسعيرها</CardTitle>
                <CardDescription>
                    قم بمراجعة وتعديل أسعار بيع الوحدات المقترحة وإدارة عمليات البيع والحجز.
                </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 p-4 border rounded-md bg-muted/50">
                <div className="relative">
                    <Label htmlFor="search-type">بحث بالنوع</Label>
                    <Input id="search-type" placeholder="مثال: شقة أمامية" value={filters.searchTerm} onChange={(e) => setFilters(prev => ({...prev, searchTerm: e.target.value, unitId: ''}))}/>
                    <Search className="absolute left-3 top-9 h-4 w-4 text-muted-foreground"/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="filter-status">فلترة بالحالة</Label>
                    <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({...prev, status: value === 'all' ? '' : value, unitId: ''}))}>
                        <SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">الكل</SelectItem>
                            <SelectItem value="متاحة">متاحة</SelectItem>
                            <SelectItem value="محجوزة">محجوزة</SelectItem>
                            <SelectItem value="مباعة">مباعة</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex items-end">
                    <Button variant="ghost" onClick={() => setFilters({searchTerm: '', status: '', unitId: ''})}>
                        <X className="ml-2 h-4 w-4"/>
                        مسح الفلاتر
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>نوع الوحدة</TableHead>
                      <TableHead>المساحة (م²)</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>السعر المقترح</TableHead>
                      <TableHead>العميل</TableHead>
                       <TableHead>بواسطة</TableHead>
                      <TableHead className="text-center">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUnits.length > 0 ? (
                      filteredUnits.map((unit) => (
                        <TableRow key={unit.id}>
                          <TableCell className="font-medium">{unit.type}</TableCell>
                          <TableCell className="font-mono">{unit.area}</TableCell>
                          <TableCell>
                            <Badge className={cn(getUnitStatusColor(unit.status, unit.floor), "text-xs")}>{unit.status}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-left text-positive">
                                {(unit.suggestedPrice || 0).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                          </TableCell>
                           <TableCell className="text-xs">
                                {unit.customerId ? (customers.find(c => c.id === unit.customerId)?.name || 'عميل غير محدد') : '-'}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline">{unit.createdByName || '-'}</Badge>
                            </TableCell>
                          <TableCell className="text-center">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                   {unit.status === 'متاحة' && <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => openSaleDialog(unit)}><WalletCards className="ml-2 h-4 w-4"/>بيع/حجز</DropdownMenuItem>}
                                   {unit.status === 'محجوزة' && (
                                        <>
                                            <DropdownMenuItem onClick={() => handleConfirmSale(unit)}><CheckCircle className="ml-2 h-4 w-4"/>تأكيد البيع</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleCancelBooking(unit)} className="text-destructive"><Undo2 className="ml-2 h-4 w-4"/>إلغاء الحجز</DropdownMenuItem>
                                        </>
                                   )}
                                   {unit.status === 'مباعة' && <DropdownMenuItem onClick={() => router.push(`/units/${unit.id}`)}><Briefcase className="ml-2 h-4 w-4"/>عرض تفاصيل الوحدة</DropdownMenuItem>}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => openEditUnitDialog(unit)}><Edit className="ml-2 h-4 w-4"/>تعديل الوحدة</DropdownMenuItem>
                                    
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="ml-2 h-4 w-4"/>حذف الوحدة</DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>هل أنت متأكد من حذف هذه الوحدة؟</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              لا يمكن التراجع عن هذا الإجراء.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90">
                                              نعم، قم بالحذف
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>

                                </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          لا توجد وحدات تطابق معايير البحث.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>

        {/* Sale Dialog */}
        <Dialog open={saleDialogState.open} onOpenChange={(open) => !open && closeSaleDialog()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>بيع أو حجز وحدة: {saleDialogState.unit?.type}</DialogTitle>
                    <DialogDescription>
                        حدد العميل وتفاصيل العملية لإتمامها. سيتم إيداع الدفعة في الصندوق المالي الخاص بالمشروع.
                    </DialogDescription>
                </DialogHeader>
                 <form onSubmit={handleBookOrSell} className="space-y-4">
                    {projectFund && (
                         <Alert variant="default">
                            <WalletCards className="h-4 w-4"/>
                            <AlertTitle>سيتم الإيداع في: {projectFund.name} (الرصيد: {projectFund.balance.toLocaleString('ar-EG', {style: 'currency', currency: 'EGP'})})</AlertTitle>
                        </Alert>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="customerId">العميل</Label>
                        <div className="flex gap-2">
                             <Combobox
                                placeholder="ابحث عن عميل..."
                                notFoundText="لم يتم العثور على العميل."
                                options={customers.map(c => ({ value: c.id, label: c.name }))}
                                value={saleFormData.customerId}
                                onSelect={(value) => setSaleFormData(prev => ({...prev, customerId: value}))}
                            />
                             <Dialog open={addCustomerDialogOpen} onOpenChange={setAddCustomerDialogOpen}>
                               <DialogTrigger asChild><Button type="button" variant="outline" size="icon"><PlusCircle/></Button></DialogTrigger>
                               <DialogContent><DialogHeader><DialogTitle>إضافة عميل جديد</DialogTitle></DialogHeader>
                                <form onSubmit={handleAddQuickCustomer} className="space-y-4">
                                    <div className="space-y-2"><Label htmlFor="name">اسم العميل</Label><Input id="name" name="name" required disabled={isSubmittingNewCustomer}/></div>
                                    <div className="space-y-2"><Label htmlFor="initialBalance">الرصيد الافتتاحي</Label><Input id="initialBalance" name="initialBalance" type="number" defaultValue="0" disabled={isSubmittingNewCustomer}/></div>
                                    <DialogFooter>
                                        <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmittingNewCustomer}>إلغاء</Button></DialogClose>
                                        <Button type="submit" disabled={isSubmittingNewCustomer}>{isSubmittingNewCustomer && <LoaderCircle className="ml-2 h-4 w-4 animate-spin"/>} إضافة</Button>
                                    </DialogFooter>
                                </form>
                               </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="actualPrice">سعر البيع النهائي</Label>
                            <Input id="actualPrice" name="actualPrice" type="number" required 
                                value={saleFormData.actualPrice}
                                onChange={(e) => setSaleFormData(prev => ({...prev, actualPrice: parseFloat(e.target.value) || 0}))}
                                disabled={isSubmittingSale} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="paidAmount">الدفعة المقدمة</Label>
                            <Input id="paidAmount" name="paidAmount" type="number" placeholder="0" 
                                value={saleFormData.paidAmount}
                                onChange={(e) => setSaleFormData(prev => ({...prev, paidAmount: parseFloat(e.target.value) || 0}))}
                                disabled={isSubmittingSale} />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="status">حالة الوحدة</Label>
                        <Select name="status" required defaultValue="محجوزة" disabled={isSubmittingSale}>
                            <SelectTrigger>
                                <SelectValue placeholder="اختر الحالة" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="محجوزة">حجز مبدئي</SelectItem>
                                <SelectItem value="مباعة">بيع نهائي</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     {remainingAmount > 0 && (
                        <Card className="bg-muted/50">
                            <CardHeader className="p-4"><CardTitle className="text-base">نظام التقسيط (المبلغ المتبقي: {remainingAmount.toLocaleString('ar-EG', {style: 'currency', currency: 'EGP'})})</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-0 grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="installmentCount">عدد الأقساط</Label>
                                    <Input id="installmentCount" name="installmentCount" type="number" placeholder="0" 
                                        value={saleFormData.installmentCount}
                                        onChange={(e) => setSaleFormData(prev => ({...prev, installmentCount: parseInt(e.target.value) || 0}))}
                                        disabled={isSubmittingSale} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="installmentFrequency">نوع القسط</Label>
                                    <Select name="installmentFrequency" 
                                        value={saleFormData.installmentFrequency}
                                        onValueChange={(value) => setSaleFormData(prev => ({...prev, installmentFrequency: value as 'monthly' | 'quarterly' | 'yearly'}))}
                                        disabled={isSubmittingSale}
                                    >
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="monthly">شهري</SelectItem>
                                            <SelectItem value="quarterly">ربع سنوي</SelectItem>
                                            <SelectItem value="yearly">سنوي</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                     )}
                     <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmittingSale}>إلغاء</Button></DialogClose>
                        <Button type="submit" disabled={isSubmittingSale || !projectFund}>
                            {isSubmittingSale && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                            حفظ العملية
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
        
        <Dialog open={editUnitDialogState.open} onOpenChange={(open) => !open && closeEditUnitDialog()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>تعديل وحدة</DialogTitle>
                </DialogHeader>
                 <form onSubmit={handleEditUnit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="type">نوع الوحدة</Label>
                        <Input id="type" name="type" required defaultValue={editUnitDialogState.unit?.type} disabled={isSubmittingEdit} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="area">المساحة (م²)</Label>
                        <Input id="area" name="area" type="number" required defaultValue={editUnitDialogState.unit?.area} disabled={isSubmittingEdit} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="notes">ملاحظات</Label>
                        <Textarea id="notes" name="notes" placeholder="أضف ملاحظات على الوحدة..." defaultValue={editUnitDialogState.unit?.notes} disabled={isSubmittingEdit} />
                    </div>
                     <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmittingEdit}>إلغاء</Button></DialogClose>
                        <Button type="submit" disabled={isSubmittingEdit}>
                            {isSubmittingEdit && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                            حفظ التعديلات
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        <Dialog open={editProjectDialogOpen} onOpenChange={setEditProjectDialogOpen}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>تعديل بيانات المشروع</DialogTitle>
                    <DialogDescription>
                        قم بتحديث التفاصيل الأساسية وهيكل الوحدات للمشروع. سيتم إعادة حساب أسعار الوحدات المقترحة تلقائيًا.
                        سيتم حذف الوحدات المتاحة فقط وإنشاء وحدات جديدة، مع الحفاظ على الوحدات المباعة والمحجوزة.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEditProjectSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto p-2">
                    <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>البيانات الأساسية</AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-name">اسم المشروع</Label>
                                    <Input id="edit-name" name="name" defaultValue={project?.name} required disabled={isSubmittingProjectEdit} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-description">وصف المشروع</Label>
                                    <Textarea id="edit-description" name="description" defaultValue={project?.description} disabled={isSubmittingProjectEdit} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-landArea">مساحة الأرض (م²)</Label>
                                        <Input id="edit-landArea" name="landArea" type="number" defaultValue={project?.landArea} disabled={isSubmittingProjectEdit} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-landPricePerMeter">سعر المتر للأرض</Label>
                                        <Input id="edit-landPricePerMeter" name="landPricePerMeter" type="number" defaultValue={project?.landPricePerMeter} disabled={isSubmittingProjectEdit} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-estimatedCosts">إجمالي تكاليف الإنشاءات</Label>
                                        <Input id="edit-estimatedCosts" name="estimatedCosts" type="number" defaultValue={project?.estimatedCosts} required disabled={isSubmittingProjectEdit} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-profitMargin">هامش الربح المستهدف (%)</Label>
                                        <Input id="edit-profitMargin" name="profitMargin" type="number" defaultValue={project?.profitMargin} required disabled={isSubmittingProjectEdit} />
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>هيكل الوحدات (للإنشاء الجديد)</AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                <div className="space-y-2">
                                        <Label htmlFor="floorCount">إجمالي عدد الطوابق</Label>
                                        <Input id="floorCount" value={floorCount} onChange={e => setFloorCount(e.target.value)} type="number" min="0" required disabled={isSubmittingProjectEdit}/>
                                    </div>
                                    <div className="flex items-center space-x-2 space-x-reverse pt-6">
                                        <Switch id="unify-floors" checked={unifyFloors} onCheckedChange={setUnifyFloors} disabled={isSubmittingProjectEdit}/>
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
                                                type="number" min="1" required disabled={isSubmittingProjectEdit}
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
                                                        placeholder="مثال: شقة أمامية" required disabled={isSubmittingProjectEdit}/>
                                                </div>
                                                    <div className="space-y-2">
                                                    <Label htmlFor={`unitArea-unified-${unitIndex}`}>المساحة (م²)</Label>
                                                    <Input 
                                                        id={`unitArea-unified-${unitIndex}`} 
                                                        value={proto.area} 
                                                        onChange={e => handleUnitPrototypeChange(0, unitIndex, 'area', e.target.value)} 
                                                        type="number" placeholder="120" required disabled={isSubmittingProjectEdit}/>
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
                                                        type="number" min="1" required disabled={isSubmittingProjectEdit}
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
                                                                placeholder="مثال: شقة أمامية" required disabled={isSubmittingProjectEdit}/>
                                                        </div>
                                                            <div className="space-y-2">
                                                            <Label htmlFor={`unitArea-${floorIndex}-${unitIndex}`}>المساحة (م²)</Label>
                                                            <Input 
                                                                id={`unitArea-${floorIndex}-${unitIndex}`} 
                                                                value={proto.area} 
                                                                onChange={e => handleUnitPrototypeChange(floorIndex, unitIndex, 'area', e.target.value)} 
                                                                type="number" placeholder="120" required disabled={isSubmittingProjectEdit}/>
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
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmittingProjectEdit}>إلغاء</Button></DialogClose>
                        <Button type="submit" disabled={isSubmittingProjectEdit}>
                            {isSubmittingProjectEdit && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                            حفظ التغييرات
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
        
        <Dialog open={managePartnersOpen} onOpenChange={setManagePartnersOpen}>
            <DialogContent className="sm:max-w-4xl">
                 <DialogHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <DialogTitle>إدارة شركاء المشروع</DialogTitle>
                            <DialogDescription>
                                حدد الشركاء واستثماراتهم وحصصهم. يمكنك صرف الأرباح المحققة من هنا.
                            </DialogDescription>
                        </div>
                        <Dialog open={addPartnerDialogOpen} onOpenChange={setAddPartnerDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline"><PlusCircle className="ml-2 h-4 w-4"/>إضافة شريك للنظام</Button>
                            </DialogTrigger>
                             <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>إضافة شريك جديد للنظام</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleAddSystemPartner} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="new-partner-name">اسم الشريك</Label>
                                        <Input id="new-partner-name" name="name" placeholder="أدخل اسم الشريك" required disabled={isSubmittingNewPartner} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="new-partner-investment">إجمالي الاستثمار المبدئي (اختياري)</Label>
                                        <Input id="new-partner-investment" name="initialInvestment" type="number" placeholder="0" defaultValue="0" disabled={isSubmittingNewPartner} />
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmittingNewPartner}>إلغاء</Button></DialogClose>
                                        <Button type="submit" disabled={isSubmittingNewPartner}>
                                            {isSubmittingNewPartner && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                                            إضافة شريك
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </DialogHeader>
                <form onSubmit={handleSavePartners}>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                        {projectPartners.map((partner, index) => (
                            <Card key={partner.id || `new-partner-${index}`} className="p-3">
                            <div className="flex items-start justify-between">
                                <div className="flex-grow space-y-2">
                                    <Label>الشريك</Label>
                                    <Combobox
                                        placeholder="ابحث عن شريك..."
                                        notFoundText="لم يتم العثور على شريك."
                                        options={availablePartnersForProject.map(p => ({ value: p.id, label: p.name }))}
                                        value={partner.id}
                                        onSelect={(value) => handlePartnerChange(index, 'id', value)}
                                    />
                                </div>
                                <div>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemovePartnerFromProject(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-green-600" onClick={() => setPayProfitDialogState({ open: true, partner })}>
                                        <Coins className="h-4 w-4"/>
                                    </Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end mt-2">
                                    <div className="space-y-2">
                                        <Label>استثمار الأرض (ج.م)</Label>
                                        <Input 
                                            type="number"
                                            placeholder="0"
                                            value={partner.landInvestment || ''}
                                            onChange={(e) => handlePartnerChange(index, 'landInvestment', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>استثمار المبنى (ج.م)</Label>
                                        <Input 
                                            type="number"
                                            placeholder="0"
                                            value={partner.buildingInvestment || ''}
                                            onChange={(e) => handlePartnerChange(index, 'buildingInvestment', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>نسبة الربح (%)</Label>
                                        <Input 
                                            type="number"
                                            placeholder="0"
                                            value={partner.profitShare || '0'}
                                            disabled
                                            className="font-bold text-primary"
                                        />
                                    </div>
                            </div>
                            </Card>
                        ))}
                        <Button type="button" variant="outline" className="w-full" onClick={handleAddPartnerToProject}>
                            <PlusCircle className="ml-2 h-4 w-4"/>
                            إضافة شريك آخر
                        </Button>
                         <div className="space-y-2 pt-4 border-t">
                            <Label htmlFor="fundingSourceAccountId">مصدر التمويل (اختياري)</Label>
                            <Select name="fundingSourceAccountId">
                                <SelectTrigger><SelectValue placeholder="اختر حسابًا (إن وجد)" /></SelectTrigger>
                                <SelectContent>
                                    {accounts.map(acc => {
                                        if (acc.id === project?.treasuryAccountId) return null; // Exclude project's own fund
                                        return <SelectItem key={acc.id} value={acc.id}>{`${acc.name} (${acc.balance.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })})`}</SelectItem>
                                    })}
                                </SelectContent>
                            </Select>
                            <p className='text-xs text-muted-foreground'>
                                إذا تم تحديد مصدر، سيتم خصم أي مبالغ جديدة منه. إذا ترك فارغاً، سيعتبر تمويلاً خارجياً.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className='mt-4'>
                        <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmittingPartners}>إلغاء</Button></DialogClose>
                        <Button type="submit" disabled={isSubmittingPartners}>
                            {isSubmittingPartners && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                            حفظ الشركاء والتمويل
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
        
        <Dialog open={manageBudgetOpen} onOpenChange={setManageBudgetOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>إدارة بنود موازنة المشروع</DialogTitle>
                    <DialogDescription>
                        أضف بنودًا من المكتبة وخصص لها مبالغ تقديرية لتتبع مصروفاتها.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                     <Dialog open={addBudgetItemOpen} onOpenChange={setAddBudgetItemOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full">
                                <PlusCircle className="ml-2 h-4 w-4" />
                                إضافة بند للمشروع
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>إضافة بند من المكتبة</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddBudgetItemToProjectSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>اختر البند</Label>
                                    <Select value={selectedGlobalBudgetItemId} onValueChange={setSelectedGlobalBudgetItemId}>
                                        <SelectTrigger><SelectValue placeholder="اختر بنداً من المكتبة" /></SelectTrigger>
                                        <SelectContent>
                                            {availableGlobalBudgetItems.map(item => (
                                                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>المبلغ المخصص للبند</Label>
                                    <Input type="number" placeholder="100000" value={newBudgetItemAmount} onChange={e => setNewBudgetItemAmount(e.target.value)} required />
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild><Button type="button" variant="secondary">إلغاء</Button></DialogClose>
                                    <Button type="submit" disabled={isSubmittingBudgetItem}>
                                        {isSubmittingBudgetItem ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "إضافة للمشروع"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                     </Dialog>
                     
                    <div className="mt-4 space-y-2">
                        {project?.budgetItems && Object.keys(project.budgetItems).length > 0 ? Object.entries(project.budgetItems).map(([id, item]) => {
                            const progress = item.allocatedAmount > 0 ? (item.spentAmount / item.allocatedAmount) * 100 : 0;
                            return (
                                <div key={id} className="p-3 border rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-semibold">{item.name}</span>
                                        <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => handleDeleteBudgetItem(id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <Progress value={progress} />
                                    <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                                        <span className="text-negative">المنصرف: {item.spentAmount.toLocaleString('ar-EG', {style: 'currency', currency: 'EGP'})}</span>
                                        <span>المخصص: {item.allocatedAmount.toLocaleString('ar-EG', {style: 'currency', currency: 'EGP'})}</span>
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className="text-center text-sm text-muted-foreground py-4">لم يتم إضافة بنود موازنة لهذا المشروع بعد.</p>
                         )}
                    </div>
                </div>
                 <CardFooter className="p-2 mt-2 bg-muted/50 rounded-md">
                     <div className="flex justify-between w-full font-bold">
                        <span>إجمالي المخصص:</span>
                        <span>{totalAllocatedBudget.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</span>
                     </div>
                 </CardFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>صرف أصناف من المخزون للمشروع</DialogTitle>
                    <DialogDescription>سيتم حساب تكلفة الأصناف المصروفة من متوسط التكلفة وتحميلها على بند الموازنة المحدد.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="itemId">الصنف</Label>
                        <Select name="itemId" required>
                            <SelectTrigger><SelectValue placeholder="اختر صنفاً من المخزون" /></SelectTrigger>
                            <SelectContent>
                                {inventoryItems.map(item => (
                                    <SelectItem key={item.id} value={item.id} disabled={item.stock <= 0}>
                                        {`${item.name} (المتوفر: ${item.stock} ${item.unit})`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quantity">الكمية المصروفة</Label>
                        <Input id="quantity" name="quantity" type="number" placeholder="أدخل الكمية" required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="budgetItemId">تحميل على بند الموازنة</Label>
                        <Select name="budgetItemId" required>
                            <SelectTrigger><SelectValue placeholder="اختر بنداً لتحميل المصروف عليه" /></SelectTrigger>
                            <SelectContent>
                               {project?.budgetItems && Object.entries(project.budgetItems).map(([id, item]) => (
                                    <SelectItem key={id} value={id}>{item.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">إلغاء</Button></DialogClose>
                        <Button type="submit" disabled={isSubmittingWithdrawal}>
                            {isSubmittingWithdrawal && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            صرف
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
        
        <Dialog open={payProfitDialogState.open} onOpenChange={(open) => !open && setPayProfitDialogState({open: false, partner: null})}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>صرف أرباح للشريك: {payProfitDialogState.partner?.name}</DialogTitle>
                    <DialogDescription>
                        سيتم خصم المبلغ من صندوق المشروع وتسجيل قيد محاسبي.
                    </DialogDescription>
                </DialogHeader>
                 <form onSubmit={handlePayProfit} className="space-y-4">
                    <Alert>
                        <Coins className="h-4 w-4"/>
                        <AlertTitle>معلومات مالية</AlertTitle>
                        <AlertDescription>
                            <div className="flex justify-between"><span>الربح المحقق المتاح للتوزيع:</span> <span className="font-bold text-positive">{projectedProfit.toLocaleString('ar-EG', {style:'currency', currency: 'EGP'})}</span></div>
                            <div className="flex justify-between"><span>رصيد صندوق المشروع الحالي:</span> <span className="font-bold">{projectFund?.balance.toLocaleString('ar-EG', {style:'currency', currency: 'EGP'})}</span></div>
                        </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                        <Label htmlFor="amount">المبلغ المراد صرفه</Label>
                        <Input id="amount" name="amount" type="number" placeholder="0.00" required disabled={isSubmittingProfitPayment}/>
                    </div>
                     <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmittingProfitPayment}>إلغاء</Button></DialogClose>
                        <Button type="submit" disabled={isSubmittingProfitPayment || projectedProfit <= 0 || (projectFund?.balance ?? 0) <= 0}>
                            {isSubmittingProfitPayment && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                            تأكيد الصرف
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    </div>
  );
}

export default function ManageProjectsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div>}>
            <ManageProjectPageComponent />
        </Suspense>
    )
}

    

