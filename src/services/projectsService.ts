

import { db } from '@/lib/firebase';
import { ref, push, onValue, get, update, set, child, increment, remove, query, orderByChild, equalTo } from 'firebase/database';
import { format } from 'date-fns';
import { createInstallmentPlan } from './installmentsService';
import { addTreasuryAccount, getTreasuryAccountNameById } from './treasuryService';
import { getUserSession } from './authService';

export interface Unit {
    id: string;
    type: string; 
    area: number; 
    notes?: string;
    suggestedPrice: number;
    status: 'متاحة' | 'محجوزة' | 'مباعة';
    // Sale details
    actualPrice?: number;
    customerId?: string;
    paidAmount?: number;
    bookingDate?: string;
    saleDate?: string;
    createdByName?: string;
}

export interface ProjectPartner {
    id: string;
    name: string;
    landInvestment: number;
    buildingInvestment: number;
    profitShare: number;
}

export interface ProjectBudgetItem {
    id: string;
    globalBudgetItemId: string;
    name: string;
    allocatedAmount: number;
    spentAmount: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  landArea?: number;
  landPricePerMeter?: number;
  estimatedCosts: number; // Total estimated costs for the project (CONSTRUCTION ONLY)
  spent: number;
  startDate: string;
  status: 'نشط' | 'مكتمل' | 'متأخر' | 'مجمد';
  profitMargin?: number; // Desired profit margin percentage
  units?: Record<string, Unit>; // List of units in the project
  partners?: Record<string, ProjectPartner>;
  treasuryAccountId?: string; // Link to the project's own fund
  budgetItems?: Record<string, ProjectBudgetItem>;
  collectedFromSales?: number;
  collectedFromPartners?: number;
}

const dataToProjectArray = (data: any): Project[] => {
    if (!data) return [];
    return Object.keys(data).map(key => ({
        id: key,
        ...data[key]
    }));
};

export const addProject = async (projectData: Omit<Project, 'id' | 'spent' | 'status' | 'units' | 'budgetItems' | 'collectedFromSales' | 'collectedFromPartners'>): Promise<Project> => {
    if (!db) throw new Error("Firebase is not initialized.");

    const treasuryAccountName = `صندوق مشروع: ${projectData.name}`;
    const newTreasuryAccountId = await addTreasuryAccount({
        name: treasuryAccountName,
        type: 'خزينة',
        balance: 0
    });

    if (!newTreasuryAccountId) {
        throw new Error("Failed to create a treasury account for the project.");
    }

    const projectsRef = ref(db, 'projects');
    const newProjectRef = push(projectsRef);
    const newProjectId = newProjectRef.key;

    if (!newProjectId) {
        throw new Error("Failed to create a new project ID.");
    }
    
    const fullProject: Omit<Project, 'id'> = {
      ...projectData,
      spent: 0,
      collectedFromSales: 0,
      collectedFromPartners: 0,
      status: 'نشط',
      units: {},
      budgetItems: {},
      treasuryAccountId: newTreasuryAccountId,
    };

    try {
        await set(newProjectRef, fullProject);
        return { id: newProjectId, ...fullProject };
    } catch (e) {
        console.error("Error adding document: ", e);
        throw new Error("Could not add project");
    }
};

export const getProjects = async (): Promise<Project[]> => {
    if (!db) return [];
    const projectsRef = ref(db, 'projects');
    const snapshot = await get(projectsRef);
    return dataToProjectArray(snapshot.val());
};

export const getProjectById = async (id: string): Promise<Project | null> => {
    if (!db) return null;
    const projectsRef = ref(db, 'projects');
    const projectRef = child(projectsRef, id);
    const snapshot = await get(projectRef);
    if (snapshot.exists()) {
        return { id: snapshot.key, ...snapshot.val() };
    } else {
        return null;
    }
}

export const listenToProjects = (callback: (projects: Project[]) => void) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    const projectsRef = ref(db, 'projects');
    return onValue(projectsRef, (snapshot) => {
        const projects = dataToProjectArray(snapshot.val());
        callback(projects);
    });
};

export const listenToProject = (id: string, callback: (project: Project | null) => void) => {
    if (!db) {
        callback(null);
        return () => {};
    }
    const projectRef = ref(db, `projects/${id}`);
    return onValue(projectRef, (snapshot) => {
        if(snapshot.exists()) {
            callback({ id: snapshot.key, ...snapshot.val() });
        } else {
            callback(null);
        }
    });
};

export const listenToUnitById = (unitId: string, callback: (unit: (Unit & {projectId: string}) | null) => void) => {
    if (!db) {
        callback(null);
        return () => {};
    }
    // This is not efficient, but it's the simplest way for RTDB without complex indexing.
    // For a large app, you'd want a different data structure or Firestore.
    const projectsRef = ref(db, 'projects');
    return onValue(projectsRef, (snapshot) => {
        const projects = snapshot.val();
        let foundUnit: (Unit & {projectId: string}) | null = null;
        if (projects) {
            for (const projectId in projects) {
                if (projects[projectId].units && projects[projectId].units[unitId]) {
                    foundUnit = {
                        ...projects[projectId].units[unitId],
                        id: unitId,
                        projectId: projectId,
                    };
                    break;
                }
            }
        }
        callback(foundUnit);
    });
}


export const updateProject = async (projectId: string, data: Partial<Project> | {[key: string]: any}) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const projectRef = ref(db, `projects/${projectId}`);
    try {
        await update(projectRef, data);
    } catch (e) {
        console.error("Error updating project: ", e);
        throw new Error("Could not update project");
    }
}

export const deleteProject = async (projectId: string) => {
    if (!db) throw new Error("Firebase is not initialized.");
    
    const updates: { [key: string]: null } = {};
    const projectRef = ref(db, `projects/${projectId}`);
    
    try {
        const projectSnapshot = await get(projectRef);
        if (projectSnapshot.exists()) {
            const projectData = projectSnapshot.val() as Project;
            
            // Mark project for deletion
            updates[`/projects/${projectId}`] = null;

            // Mark associated treasury account for deletion
            if (projectData.treasuryAccountId) {
                updates[`/treasuryAccounts/${projectData.treasuryAccountId}`] = null;
            }
            
            await update(ref(db), updates);
        }
    } catch (e) {
        console.error("Error deleting project and its treasury account: ", e);
        throw new Error("Could not delete project");
    }
};

export const addBudgetItemToProject = async (projectId: string, item: Omit<ProjectBudgetItem, 'id' | 'spentAmount'>) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const budgetItemsRef = ref(db, `projects/${projectId}/budgetItems`);
    const newItemRef = push(budgetItemsRef);
    const fullItem: Omit<ProjectBudgetItem, 'id'> = {
        ...item,
        spentAmount: 0
    };
    await set(newItemRef, fullItem);
    return newItemRef.key;
};

export const deleteBudgetItemFromProject = async (projectId: string, budgetItemId: string) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const budgetItemRef = ref(db, `projects/${projectId}/budgetItems/${budgetItemId}`);
    await remove(budgetItemRef);
};


export const batchAddUnitsToProject = async (projectId: string, newUnitPrototypes: Omit<Unit, 'id'>[], projectData: Project) => {
    if (!db) throw new Error("Firebase is not initialized.");
    if (newUnitPrototypes.length === 0) return;

    const updates: { [key: string]: any } = {};
    const unitsRef = child(ref(db), `projects/${projectId}/units`);

    const landCost = (projectData.landArea || 0) * (projectData.landPricePerMeter || 0);
    const totalCost = (projectData.estimatedCosts || 0) + landCost;
    const requiredRevenue = totalCost * (1 + (projectData.profitMargin || 0) / 100);

    const totalArea = newUnitPrototypes.reduce((sum, unit) => sum + unit.area, 0);
    const pricePerMeter = totalArea > 0 ? requiredRevenue / totalArea : 0;
    
    newUnitPrototypes.forEach(unit => {
        const newUnitKey = push(unitsRef).key;
        if (newUnitKey) {
            updates[`/projects/${projectId}/units/${newUnitKey}`] = {
                ...unit,
                suggestedPrice: Math.round((unit.area * pricePerMeter) / 100) * 100
            };
        }
    });

    try {
        await update(ref(db), updates);
    } catch (e) {
        console.error("Error batch adding units: ", e);
        throw new Error("Could not batch add units");
    }
}


export interface BookOrSellParams {
    projectId: string;
    projectName: string;
    unitId: string;
    unitType: string;
    customerId: string;
    customerName: string;
    actualPrice: number;
    paidAmount: number;
    newStatus: 'محجوزة' | 'مباعة';
    accountId: string;
    accountName: string;
    installmentOptions?: {
        count: number;
        frequency: 'monthly' | 'quarterly' | 'yearly';
        remainingAmount: number;
    }
}

export const bookOrSellUnit = async (params: BookOrSellParams) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const { projectId, projectName, unitId, unitType, customerId, customerName, actualPrice, paidAmount, newStatus, accountId, accountName, installmentOptions } = params;
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const user = getUserSession();

    const updates: { [key: string]: any } = {};

    const unitDataSnapshot = await get(ref(db, `projects/${projectId}/units/${unitId}`));
    const unitData = unitDataSnapshot.val();

    const unitUpdateData: Partial<Unit> = {
        ...unitData,
        status: newStatus,
        customerId: customerId,
        actualPrice: actualPrice,
        paidAmount: paidAmount,
        createdByName: user?.name || 'N/A'
    };

    if (newStatus === 'محجوزة') unitUpdateData.bookingDate = today;
    if (newStatus === 'مباعة') unitUpdateData.saleDate = today;
    
    updates[`/projects/${projectId}/units/${unitId}`] = unitUpdateData;

    const remainingBalance = actualPrice - paidAmount;
    updates[`/customers/${customerId}/balance`] = increment(remainingBalance);
    
    if (paidAmount > 0) {
        updates[`/treasuryAccounts/${accountId}/balance`] = increment(paidAmount);
        updates[`/projects/${projectId}/collectedFromSales`] = increment(paidAmount);
    }

    const journalDescription = `دفعة من ${customerName} لـ ${newStatus === 'مباعة' ? 'شراء' : 'حجز'} وحدة (${unitType}) في مشروع ${projectName}`;
    
    if (paidAmount > 0) {
        const newJournalKey = push(child(ref(db), 'journalEntries')).key;
        if (newJournalKey) {
            updates[`/journalEntries/${newJournalKey}`] = {
                date: today,
                description: journalDescription,
                debitAccount: accountName,
                creditAccount: `ذمم مدينة - العملاء`,
                amount: paidAmount,
            };
        }
    }
    
    if(remainingBalance > 0) {
        const receivableJournalKey = push(child(ref(db), 'journalEntries')).key;
        if(receivableJournalKey) {
            updates[`/journalEntries/${receivableJournalKey}`] = {
                date: today,
                description: `إثبات مديونية على ${customerName} لشراء وحدة (${unitType})`,
                debitAccount: `ذمم مدينة - العملاء`,
                creditAccount: `إيرادات مبيعات الوحدات`,
                amount: remainingBalance,
           };
       }
    }

    try {
        await update(ref(db), updates);
    } catch(e) {
        console.error("Booking/Selling transaction failed (part 1): ", e);
        throw new Error("Could not process the booking/sale transaction.");
    }
    
    if (installmentOptions && installmentOptions.remainingAmount > 0 && installmentOptions.count > 0) {
        try {
            await createInstallmentPlan(
                customerId,
                projectId,
                unitId,
                installmentOptions.remainingAmount,
                installmentOptions.count,
                installmentOptions.frequency
            );
        } catch (e) {
             console.error("Failed to create installment plan: ", e);
        }
    }
}

export interface UpdatePartnersParams {
    projectId: string;
    projectName: string;
    newPartnersMap: Record<string, ProjectPartner>;
    fundingSourceAccountId: string | null;
    projectFundId: string;
}

export const updateProjectPartners = async (params: UpdatePartnersParams) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const { projectId, projectName, newPartnersMap, fundingSourceAccountId, projectFundId } = params;

    const projectSnap = await get(ref(db, `projects/${projectId}`));
    if (!projectSnap.exists()) throw new Error("Project not found.");
    const currentProject = projectSnap.val() as Project;

    const oldPartnersMap = currentProject.partners || {};
    const updates: { [key: string]: any } = {};
    const today = format(new Date(), 'yyyy-MM-dd');
    const projectFundName = await getTreasuryAccountNameById(projectFundId);
    if (!projectFundName) throw new Error("Project fund not found.");

    let totalNewFunding = 0;

    for (const partnerId in newPartnersMap) {
        const newPartner = newPartnersMap[partnerId];
        const oldPartner = oldPartnersMap[partnerId];
        const newTotalInvestment = (newPartner.landInvestment || 0) + (newPartner.buildingInvestment || 0);
        const oldTotalInvestment = oldPartner ? (oldPartner.landInvestment || 0) + (oldPartner.buildingInvestment || 0) : 0;
        
        const fundingIncrease = newTotalInvestment - oldTotalInvestment;

        if (fundingIncrease > 0) {
            totalNewFunding += fundingIncrease;
            updates[`/partners/${partnerId}/totalInvestment`] = increment(fundingIncrease);
        }
    }
    
    if (totalNewFunding > 0) {
        updates[`/treasuryAccounts/${projectFundId}/balance`] = increment(totalNewFunding);
        updates[`/projects/${projectId}/collectedFromPartners`] = increment(totalNewFunding);
        
        let journalCreditAccount = 'رأس المال';

        if(fundingSourceAccountId) {
            updates[`/treasuryAccounts/${fundingSourceAccountId}/balance`] = increment(-totalNewFunding);
            const sourceAccountName = await getTreasuryAccountNameById(fundingSourceAccountId);
            journalCreditAccount = sourceAccountName || 'حساب غير محدد';
        }
        
        const journalEntry = {
            date: today,
            description: `إيداع تمويل شركاء لمشروع ${projectName}`,
            debitAccount: projectFundName,
            creditAccount: journalCreditAccount,
            amount: totalNewFunding,
        };
        const newJournalKey = push(child(ref(db), 'journalEntries')).key;
        updates[`/journalEntries/${newJournalKey}`] = journalEntry;
    }

    updates[`/projects/${projectId}/partners`] = newPartnersMap;
    
    try {
        await update(ref(db), updates);
    } catch(e) {
        console.error("Updating project partners and funding failed: ", e);
        throw new Error("Could not update project partners.");
    }
};

export const recalculatePricing = async (projectId: string, newAvgPricePerMeter: number) => {
    if (!db) throw new Error("Firebase is not initialized.");
    
    const projectRef = ref(db, `projects/${projectId}`);
    const projectSnap = await get(projectRef);
    if (!projectSnap.exists()) throw new Error("Project not found.");

    const projectData = projectSnap.val() as Project;
    const units = projectData.units ? Object.values(projectData.units) : [];
    
    if (units.length === 0) return;

    const totalArea = units.reduce((acc, u) => acc + u.area, 0);
    if (totalArea === 0) return;
    
    const landCost = (projectData.landArea || 0) * (projectData.landPricePerMeter || 0);
    const totalCost = (projectData.estimatedCosts || 0) + landCost;

    const newRequiredRevenue = totalArea * newAvgPricePerMeter;
    const newProfitMargin = totalCost > 0 ? ((newRequiredRevenue / totalCost) - 1) * 100 : 0;
    
    const updates: { [key: string]: any } = {};
    updates[`/projects/${projectId}/profitMargin`] = newProfitMargin;

    Object.entries(projectData.units).forEach(([unitId, unit]) => {
        if(unit.status === 'متاحة') {
            updates[`/projects/${projectId}/units/${unitId}/suggestedPrice`] = Math.round((unit.area * newAvgPricePerMeter) / 100) * 100;
        }
    });

    try {
        await update(ref(db), updates);
    } catch (e) {
        console.error("Error recalculating pricing: ", e);
        throw new Error("Could not recalculate project pricing.");
    }
};

export const recalculatePricingByProfitMargin = async (projectId: string, newProfitMargin: number, projectData?: Project) => {
    if (!db) throw new Error("Firebase is not initialized.");
    
    if (!projectData) {
        const projectRef = ref(db, `projects/${projectId}`);
        const projectSnap = await get(projectRef);
        if (!projectSnap.exists()) throw new Error("Project not found.");
        projectData = projectSnap.val() as Project;
    }

    const units = projectData.units ? Object.values(projectData.units) : [];
    const updates: { [key: string]: any } = {};
    updates[`/projects/${projectId}/profitMargin`] = newProfitMargin;
    
    if (units.length > 0) {
        const totalArea = units.reduce((acc, u) => acc + u.area, 0);
        if (totalArea > 0) {
            const landCost = (projectData.landArea || 0) * (projectData.landPricePerMeter || 0);
            const totalCost = (projectData.estimatedCosts || 0) + landCost;

            const newRequiredRevenue = totalCost * (1 + newProfitMargin / 100);
            const newAvgPricePerMeter = newRequiredRevenue / totalArea;
            
            Object.entries(projectData.units || {}).forEach(([unitId, unit]) => {
                if (unit.status === 'متاحة') {
                    updates[`/projects/${projectId}/units/${unitId}/suggestedPrice`] = Math.round((unit.area * newAvgPricePerMeter) / 100) * 100;
                }
            });
        }
    }

    try {
        await update(ref(db), updates);
    } catch (e) {
        console.error("Error recalculating pricing by profit margin: ", e);
        throw new Error("Could not recalculate project pricing by profit margin.");
    }
};

export interface PayPartnerProfitParams {
    projectId: string;
    projectName: string;
    partnerId: string;
    partnerName: string;
    amount: number;
    projectFundId: string;
    projectFundName: string;
}

export const payPartnerProfit = async (params: PayPartnerProfitParams) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const { projectId, projectName, partnerId, partnerName, amount, projectFundId, projectFundName } = params;

    const updates: { [key: string]: any } = {};
    const today = format(new Date(), 'yyyy-MM-dd');

    // 1. Debit project fund
    updates[`/treasuryAccounts/${projectFundId}/balance`] = increment(-amount);
    // 2. Reduce the collectedFromSales (as profit is derived from it) to reflect the payout.
    updates[`/projects/${projectId}/collectedFromSales`] = increment(-amount);

    // 3. Create Journal Entry
    const journalEntry = {
        date: today,
        description: `صرف أرباح للشريك ${partnerName} من مشروع ${projectName}`,
        debitAccount: `توزيعات أرباح الشركاء`,
        creditAccount: projectFundName,
        amount: amount,
    };
    const newJournalKey = push(child(ref(db), 'journalEntries')).key;
    updates[`/journalEntries/${newJournalKey}`] = journalEntry;

    try {
        await update(ref(db), updates);
    } catch (e) {
        console.error("Error paying partner profit: ", e);
        throw new Error("Could not pay partner profit.");
    }
};

export const confirmSale = async (projectId: string, unitId: string) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const unitRef = ref(db, `projects/${projectId}/units/${unitId}`);
    const today = format(new Date(), 'yyyy-MM-dd');
    try {
        await update(unitRef, {
            status: 'مباعة',
            saleDate: today
        });
    } catch(e) {
        console.error("Error confirming sale: ", e);
        throw new Error("Could not confirm sale.");
    }
};

export interface CancelBookingParams {
    projectId: string;
    unitId: string;
    customerId: string;
    paidAmount: number;
    projectFundId: string;
}

export const cancelBooking = async (params: CancelBookingParams) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const { projectId, unitId, customerId, paidAmount, projectFundId } = params;
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const updates: { [key: string]: any } = {};
    
    // 1. Reset unit status and details
    updates[`/projects/${projectId}/units/${unitId}/status`] = 'متاحة';
    updates[`/projects/${projectId}/units/${unitId}/customerId`] = null;
    updates[`/projects/${projectId}/units/${unitId}/actualPrice`] = null;
    updates[`/projects/${projectId}/units/${unitId}/paidAmount`] = null;
    updates[`/projects/${projectId}/units/${unitId}/bookingDate`] = null;
    updates[`/projects/${projectId}/units/${unitId}/saleDate`] = null;

    if (paidAmount > 0) {
        // 2. Reverse financial impact
        updates[`/customers/${customerId}/balance`] = increment(-paidAmount);
        updates[`/treasuryAccounts/${projectFundId}/balance`] = increment(-paidAmount);
        updates[`/projects/${projectId}/collectedFromSales`] = increment(-paidAmount);
        
        // 3. Create reversal journal entry
        const projectFundName = await getTreasuryAccountNameById(projectFundId) || 'صندوق المشروع';
        const journalEntry = {
            date: today,
            description: `إلغاء حجز وحدة وعكس دفعة مقدمة`,
            debitAccount: 'ذمم مدينة - العملاء',
            creditAccount: projectFundName,
            amount: paidAmount,
        };
        const newJournalKey = push(child(ref(db), 'journalEntries')).key;
        updates[`/journalEntries/${newJournalKey}`] = journalEntry;
    }
    
    // 4. Delete related installments (if any)
    const installmentsQuery = query(ref(db, 'installments'), orderByChild('unitId'), equalTo(unitId));
    const installmentsSnap = await get(installmentsQuery);
    if(installmentsSnap.exists()) {
        installmentsSnap.forEach(snap => {
            updates[`/installments/${snap.key}`] = null;
        });
    }
    
    try {
        await update(ref(db), updates);
    } catch(e) {
        console.error("Error cancelling booking: ", e);
        throw new Error("Could not cancel booking.");
    }
}


/**
 * @deprecated This function is obsolete. Use updateProjectPartners instead.
 */
export const addPartnerFunding = async () => {
    throw new Error("This function is obsolete. Use updateProjectPartners instead.");
};
    

    









