

import { db } from '@/lib/firebase';
import { ref, push, onValue, set, query, orderByChild, equalTo, get, update, increment, child, remove } from 'firebase/database';
import { Item } from './inventoryService';
import { format } from 'date-fns';
import { getNextSequentialNumber } from './countersService';
import type { PurchaseInvoice } from './purchasesService';
import { addAuditLog } from './auditLogService';
import { getUserSession } from './authService';

export interface Expense {
  id: string;
  projectId: string;
  type: string; // This will now store the ExpenseType name
  amount: number;
  date: string;
  description?: string;
  budgetItemId?: string; // The project-specific budget item ID
  globalBudgetItemId?: string; // The ID from the global budgetItems collection
  budgetItemName?: string;
  expenseTypeId?: string;
  accountId?: string; // The account it was paid from
  referenceNumber?: string;
  createdByName?: string;
}

export interface ExpenseType {
  id: string;
  name: string;
}

const dataToExpenseArray = (data: any): Expense[] => {
    if (!data) return [];
    return Object.keys(data).map(key => ({
        id: key,
        ...data[key]
    }));
};

const dataToExpenseTypeArray = (data: any): ExpenseType[] => {
    if (!data) return [];
    return Object.keys(data).map(key => ({
        id: key,
        ...data[key]
    }));
};


export const addExpense = async (expense: Omit<Expense, 'id'>, accountId: string, accountName: string) => {
    if (!db) throw new Error("Firebase is not initialized.");
    try {
        const updates: { [key: string]: any } = {};
        
        const user = getUserSession();

        const expenseWithMeta: Omit<Expense, 'id'> = { 
            ...expense, 
            accountId,
            createdByName: user?.name || 'N/A' 
        };

        const budgetItemSnap = await get(ref(db, `/projects/${expense.projectId}/budgetItems/${expense.budgetItemId}`));
        if(budgetItemSnap.exists()) {
            expenseWithMeta.globalBudgetItemId = budgetItemSnap.val().globalBudgetItemId;
        }

        const newExpenseKey = push(child(ref(db), 'expenses')).key;
        if (!newExpenseKey) throw new Error("Failed to generate new key for expense");
        

        updates[`/projects/${expense.projectId}/spent`] = increment(expense.amount);
        
        if (expense.budgetItemId) {
            updates[`/projects/${expense.projectId}/budgetItems/${expense.budgetItemId}/spentAmount`] = increment(expense.amount);
        }
        
        updates[`/expenses/${newExpenseKey}`] = expenseWithMeta;
        updates[`/treasuryAccounts/${accountId}/balance`] = increment(-expense.amount);

        const projectSnap = await get(child(ref(db), `projects/${expense.projectId}`));
        const projectName = projectSnap.val()?.name || 'مشروع غير محدد';
        
        const debitAccount = expense.budgetItemName 
            ? `مصروفات ${expense.budgetItemName} - ${expense.type}`
            : `مصروفات مشروع - ${expense.type}`;

        const journalEntry = {
            date: expense.date,
            description: `مصروف نقدي للمشروع (${projectName}): ${expense.description || expense.type}`,
            debitAccount: debitAccount,
            creditAccount: accountName,
            amount: expense.amount,
        };
        const newJournalKey = push(child(ref(db), 'journalEntries')).key;
        updates[`/journalEntries/${newJournalKey}`] = journalEntry;

        await update(ref(db), updates);
        await addAuditLog('create', 'expense', newExpenseKey, `Created expense for ${projectName} of ${expense.amount} for "${expense.description}"`);
        
    } catch (e) {
        console.error("Error adding expense transaction: ", e);
        throw new Error("Could not add expense");
    }
};

export const updateExpense = async (originalExpense: Expense, newExpenseData: Omit<Expense, 'id'>) => {
    if (!db) throw new Error("Firebase is not initialized.");

    const amountDifference = newExpenseData.amount - originalExpense.amount;
    
    // Check if the fund has enough balance for the increase
    if (amountDifference > 0 && originalExpense.accountId) {
        const accountRef = ref(db, `treasuryAccounts/${originalExpense.accountId}/balance`);
        const balanceSnap = await get(accountRef);
        if (balanceSnap.val() < amountDifference) {
            throw new Error("رصيد الصندوق غير كافٍ لتغطية الزيادة في المصروف.");
        }
    }

    try {
        const updates: { [key: string]: any } = {};
        
        const expenseUpdateData = { ...originalExpense, ...newExpenseData };

        // 1. Update the expense record itself
        updates[`/expenses/${originalExpense.id}`] = expenseUpdateData;

        // 2. Adjust project's total spent
        updates[`/projects/${originalExpense.projectId}/spent`] = increment(amountDifference);
        
        // 3. Adjust budget item spent amount
        if (originalExpense.budgetItemId === newExpenseData.budgetItemId) {
             if (originalExpense.budgetItemId) {
                updates[`/projects/${originalExpense.projectId}/budgetItems/${originalExpense.budgetItemId}/spentAmount`] = increment(amountDifference);
            }
        } else {
            // If budget item changed, reverse old and add to new
            if (originalExpense.budgetItemId) {
                updates[`/projects/${originalExpense.projectId}/budgetItems/${originalExpense.budgetItemId}/spentAmount`] = increment(-originalExpense.amount);
            }
            if (newExpenseData.budgetItemId) {
                 updates[`/projects/${originalExpense.projectId}/budgetItems/${newExpenseData.budgetItemId}/spentAmount`] = increment(newExpenseData.amount);
                 const budgetItemSnap = await get(ref(db, `/projects/${newExpenseData.projectId}/budgetItems/${newExpenseData.budgetItemId}`));
                 if(budgetItemSnap.exists()) {
                     expenseUpdateData.globalBudgetItemId = budgetItemSnap.val().globalBudgetItemId;
                     updates[`/expenses/${originalExpense.id}/globalBudgetItemId`] = budgetItemSnap.val().globalBudgetItemId;
                 }
            }
        }

        // 4. Adjust treasury account balance
        if (originalExpense.accountId) {
             updates[`/treasuryAccounts/${originalExpense.accountId}/balance`] = increment(-amountDifference);
        }
        
        await update(ref(db), updates);
        await addAuditLog('update', 'expense', originalExpense.id, `Updated expense. New amount: ${newExpenseData.amount}`);


    } catch(e) {
        console.error("Error updating expense: ", e);
        throw new Error("Could not update expense.");
    }
}

export const deleteExpense = async (expense: Expense) => {
    if (!db) throw new Error("Firebase is not initialized.");
    try {
        const updates: { [key: string]: any } = {};
        
        // 1. Remove the expense record
        updates[`/expenses/${expense.id}`] = null;

        // 2. Reverse project spent amount
        updates[`/projects/${expense.projectId}/spent`] = increment(-expense.amount);

        // 3. Reverse budget item spent amount
        if (expense.budgetItemId) {
            updates[`/projects/${expense.projectId}/budgetItems/${expense.budgetItemId}/spentAmount`] = increment(-expense.amount);
        }

        // 4. Reverse treasury account balance (if accountId is stored)
        if (expense.accountId) {
             updates[`/treasuryAccounts/${expense.accountId}/balance`] = increment(expense.amount);
        } else {
            console.warn(`Cannot reverse treasury balance for expense ${expense.id} because accountId is missing.`);
        }
        
        await update(ref(db), updates);
        await addAuditLog('delete', 'expense', expense.id, `Deleted expense of ${expense.amount} for "${expense.description}"`);

    } catch (e) {
        console.error("Error deleting expense transaction: ", e);
        throw new Error("Could not delete expense");
    }
}


export const listenToExpenses = (callback: (expenses: Expense[]) => void) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    const expensesRef = ref(db, 'expenses');
    return onValue(expensesRef, (snapshot) => {
        const data = snapshot.val();
        const expenses = dataToExpenseArray(data).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        callback(expenses);
    });
};

export const getExpensesByProjectId = async (projectId: string): Promise<Expense[]> => {
    if (!db) return [];
    const expensesRef = ref(db, 'expenses');
    const q = query(expensesRef, orderByChild("projectId"), equalTo(projectId));
    const snapshot = await get(q);
    return dataToExpenseArray(snapshot.val());
}

export const listenToExpensesByProjectId = (projectId: string, callback: (expenses: Expense[]) => void) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    const expensesRef = ref(db, 'expenses');
    const q = query(expensesRef, orderByChild("projectId"), equalTo(projectId));
    return onValue(q, (snapshot) => {
        const expenses = dataToExpenseArray(snapshot.val());
        callback(expenses);
    });
};

export interface WithdrawalParams {
    projectId: string;
    budgetItemId: string;
    budgetItemName: string;
    item: Item;
    quantity: number;
    notes?: string;
}

const getLastPurchasePrice = async (itemId: string): Promise<number | null> => {
    const purchasesRef = ref(db, 'purchases');
    const purchasesSnapshot = await get(purchasesRef);
    if (!purchasesSnapshot.exists()) {
        return null;
    }

    const allInvoices: PurchaseInvoice[] = Object.values(purchasesSnapshot.val());

    const relevantInvoices = allInvoices
        .filter(inv => inv.items.some(item => item.itemId === itemId))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (relevantInvoices.length === 0) {
        return null;
    }
    
    const lastInvoice = relevantInvoices[0];
    const lastPurchaseItem = lastInvoice.items.find(item => item.itemId === itemId);
    
    return lastPurchaseItem ? lastPurchaseItem.price : null;
};


export const withdrawFromInventory = async (params: WithdrawalParams) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const { projectId, budgetItemId, budgetItemName, item, quantity, notes } = params;
    
    if (item.stock < quantity) {
        throw new Error("الكمية المطلوبة أكبر من الرصيد المتوفر في المخزون.");
    }
    
    const lastPrice = await getLastPurchasePrice(item.id);
    const costToUse = lastPrice !== null ? lastPrice : item.cost;
    
    if (costToUse === 0) {
        console.warn(`Cost for item ${item.name} is zero. The expense will be recorded with zero value.`);
    }

    const expenseAmount = costToUse * quantity;
    
    try {
        const updates: { [key: string]: any } = {};

        const withdrawalNumber = await getNextSequentialNumber('inventoryWithdrawal');
        
        const budgetItemSnap = await get(ref(db, `/projects/${projectId}/budgetItems/${budgetItemId}`));
        const globalBudgetItemId = budgetItemSnap.exists() ? budgetItemSnap.val().globalBudgetItemId : undefined;

        const user = getUserSession();

        const newExpense: Omit<Expense, 'id'> = {
            projectId,
            type: `صرف مخزون: ${item.name}`,
            amount: expenseAmount,
            description: `صرف كمية (${quantity} ${item.unit}) من المخزون بسعر الوحدة ${costToUse.toLocaleString()}. ${notes || ''}`,
            date: format(new Date(), 'yyyy-MM-dd'),
            budgetItemId,
            budgetItemName,
            globalBudgetItemId,
            referenceNumber: withdrawalNumber,
            createdByName: user?.name || 'N/A',
        };
        const newExpenseKey = push(child(ref(db), 'expenses')).key;
        if (!newExpenseKey) throw new Error("Could not create key for inventory withdrawal expense");
        updates[`/expenses/${newExpenseKey}`] = newExpense;

        updates[`/projects/${projectId}/spent`] = increment(expenseAmount);
        updates[`/projects/${projectId}/budgetItems/${budgetItemId}/spentAmount`] = increment(expenseAmount);
        
        updates[`/items/${item.id}/stock`] = increment(-quantity);

        const projectSnap = await get(child(ref(db), `projects/${projectId}`));
        const projectName = projectSnap.val()?.name || 'مشروع غير محدد';
        
        const journalEntry = {
            date: format(new Date(), 'yyyy-MM-dd'),
            description: `إذن صرف مخزني ${withdrawalNumber} للمشروع (${projectName}). صنف: ${item.name}, كمية: ${quantity}`,
            debitAccount: `مصروفات ${budgetItemName}`,
            creditAccount: 'المخزون',
            amount: expenseAmount,
        };
        const newJournalKey = push(child(ref(db), 'journalEntries')).key;
        updates[`/journalEntries/${newJournalKey}`] = journalEntry;
        
        await update(ref(db), updates);
        await addAuditLog('inventory_withdrawal', 'item', item.id, `Withdrew ${quantity} ${item.unit} of ${item.name} for project ${projectName}`);

    } catch (e) {
        console.error("Error processing inventory withdrawal: ", e);
        if (e instanceof Error) {
            throw e;
        }
        throw new Error("Could not process inventory withdrawal.");
    }
};

// Expense Types services
export const addExpenseType = async (item: Omit<ExpenseType, 'id'>) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const itemsRef = ref(db, 'expenseTypes');
    const newItemRef = push(itemsRef);
    await set(newItemRef, item);
    const newId = newItemRef.key;
    if (newId) {
        await addAuditLog('create', 'expenseType', newId, `Created expense type: ${item.name}`);
    }
    return newId;
};

export const deleteExpenseType = async (id: string) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const itemRef = ref(db, `expenseTypes/${id}`);
    const snapshot = await get(itemRef);
    const item = snapshot.val();
    await remove(itemRef);
    await addAuditLog('delete', 'expenseType', id, `Deleted expense type: ${item?.name || 'N/A'}`);
};

export const listenToExpenseTypes = (callback: (items: ExpenseType[]) => void) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    const itemsRef = ref(db, 'expenseTypes');
    return onValue(itemsRef, (snapshot) => {
        const data = snapshot.val();
        callback(dataToExpenseTypeArray(data));
    });
};

export const getExpenseTypeById = async (id: string): Promise<ExpenseType | null> => {
    if (!db) return null;
    const itemRef = ref(db, `expenseTypes/${id}`);
    const snapshot = await get(itemRef);
    if(snapshot.exists()) {
        return { id: snapshot.key, ...snapshot.val() };
    }
    return null;
}
