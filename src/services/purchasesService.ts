

import { db } from '@/lib/firebase';
import { ref, push, onValue, set, update, increment, get, child } from 'firebase/database';
import { getTreasuryAccountNameById } from './treasuryService';
import { getNextSequentialNumber } from './countersService';
import { ProjectBudgetItem } from './projectsService';
import { addAuditLog } from './auditLogService';
import { getUserSession } from './authService';

export interface PurchaseInvoiceItem {
    itemId: string;
    quantity: number;
    price: number;
    total: number;
}

export interface PurchaseInvoice {
  id: string;
  supplierId: string;
  supplierName?: string;
  invoiceNumber: string;
  supplierInvoiceNumber?: string; // Optional field for supplier's invoice number
  date: string;
  items: PurchaseInvoiceItem[];
  totalAmount: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentAccountId?: string;
  purchaseType: 'inventory' | 'project';
  projectId?: string;
  budgetItemId?: string;
  createdByName?: string;
}

const dataToPurchaseInvoiceArray = (data: any): PurchaseInvoice[] => {
    if (!data) return [];
    return Object.keys(data).map(key => ({
        id: key,
        ...data[key]
    }));
};

export const addPurchaseInvoice = async (invoice: Omit<PurchaseInvoice, 'id' | 'invoiceNumber'>) => {
    if (!db) throw new Error("Firebase is not initialized.");
    try {
        const updates: { [key: string]: any } = {};
        const purchasesRef = ref(db, 'purchases');
        
        const invoiceNumber = await getNextSequentialNumber('purchaseInvoice');
        const user = getUserSession();

        const newInvoiceKey = push(purchasesRef).key;
        if (!newInvoiceKey) throw new Error("Could not generate key for new invoice");
        
        const fullInvoice: Omit<PurchaseInvoice, 'id'> = { 
            ...invoice, 
            invoiceNumber,
            createdByName: user?.name || 'N/A'
        };
        
        if (fullInvoice.paymentAccountId === undefined || fullInvoice.paymentAccountId === null) {
            delete fullInvoice.paymentAccountId;
        }
        if (fullInvoice.projectId === undefined || fullInvoice.projectId === null) {
            delete fullInvoice.projectId;
        }
        if (fullInvoice.budgetItemId === undefined || fullInvoice.budgetItemId === null) {
            delete fullInvoice.budgetItemId;
        }

        updates[`/purchases/${newInvoiceKey}`] = fullInvoice;

        const debitAccount = invoice.purchaseType === 'inventory' ? 'المخزون' : 'مصروفات مشتريات مشروع';
        
        // 1. Journal entry for the total purchase (creates liability)
        const purchaseJournalEntry = {
            date: invoice.date,
            description: `فاتورة شراء رقم ${invoice.supplierInvoiceNumber || invoiceNumber} من ${invoice.supplierName || ''}`,
            debitAccount: debitAccount,
            creditAccount: 'ذمم دائنة - الموردين',
            amount: invoice.totalAmount,
        };
        const newPurchaseJournalKey = push(child(ref(db), 'journalEntries')).key;
        updates[`/journalEntries/${newPurchaseJournalKey}`] = purchaseJournalEntry;

        // 2. Update supplier balance with the full invoice amount
        updates[`/suppliers/${invoice.supplierId}/balance`] = increment(invoice.totalAmount);
        
        // 3. Handle payment if any
        if (invoice.paidAmount && invoice.paidAmount > 0) {
            if (!invoice.paymentAccountId) throw new Error("Payment account ID is missing for a paid invoice.");
            
            const paymentAccountName = await getTreasuryAccountNameById(invoice.paymentAccountId);
            if (!paymentAccountName) throw new Error("Payment account not found");
            
            // 3a. Create payment journal entry
            const paymentJournalEntry = {
                date: invoice.date,
                description: `سداد دفعة من فاتورة ${invoice.supplierInvoiceNumber || invoiceNumber}`,
                debitAccount: 'ذمم دائنة - الموردين',
                creditAccount: paymentAccountName,
                amount: invoice.paidAmount,
            };
            const newPaymentJournalKey = push(child(ref(db), 'journalEntries')).key;
            updates[`/journalEntries/${newPaymentJournalKey}`] = paymentJournalEntry;
            
            // 3b. Decrease supplier balance by the paid amount
            updates[`/suppliers/${invoice.supplierId}/balance`] = increment(-invoice.paidAmount);

            // 3c. Decrease treasury account balance
            updates[`/treasuryAccounts/${invoice.paymentAccountId}/balance`] = increment(-invoice.paidAmount);
        }

        // 4. Handle inventory or project updates
        if (invoice.purchaseType === 'inventory') {
            for (const item of invoice.items) {
                const itemRef = ref(db, `items/${item.itemId}`);
                const itemSnap = await get(itemRef);
                if (!itemSnap.exists()) {
                    console.warn(`Item with ID ${item.itemId} does not exist! Skipping stock update.`);
                    continue;
                }
                const currentItem = itemSnap.val();
                const currentStock = currentItem.stock || 0;
                const currentCost = currentItem.cost || 0;

                const newStock = currentStock + item.quantity;
                const newAverageCost = newStock > 0 ? ((currentStock * currentCost) + (item.quantity * item.price)) / newStock : item.price;
                
                updates[`/items/${item.itemId}/stock`] = newStock;
                updates[`/items/${item.itemId}/cost`] = newAverageCost;
            }
        } else if (invoice.purchaseType === 'project' && invoice.projectId && invoice.budgetItemId) {
             updates[`/projects/${invoice.projectId}/spent`] = increment(invoice.totalAmount);
             updates[`/projects/${invoice.projectId}/budgetItems/${invoice.budgetItemId}/spentAmount`] = increment(invoice.totalAmount);
        }
        
        await update(ref(db), updates);
        await addAuditLog('create', 'purchaseInvoice', newInvoiceKey, `Created purchase invoice ${invoiceNumber} for ${invoice.supplierName} with total ${invoice.totalAmount}`);


    } catch (e) {
        console.error("Transaction failed: ", e);
        if (e instanceof Error) throw e;
        throw new Error("Could not add purchase invoice due to a transaction error.");
    }
};

export const listenToPurchaseInvoices = (callback: (invoices: PurchaseInvoice[]) => void) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    const purchasesRef = ref(db, 'purchases');
    return onValue(purchasesRef, (snapshot) => {
        const invoices = dataToPurchaseInvoiceArray(snapshot.val());
        callback(invoices.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });
};
