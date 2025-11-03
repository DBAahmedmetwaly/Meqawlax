

import { db } from '@/lib/firebase';
import { ref, push, onValue, set, get, child, update, increment } from 'firebase/database';
import { addAuditLog } from './auditLogService';

export interface Customer {
  id: string;
  name: string;
  balance: number;
  status: 'مستحق' | 'مسدد' | 'متأخر';
}

const dataToCustomerArray = (data: any): Customer[] => {
    if (!data) return [];
    return Object.keys(data).map(key => ({
        id: key,
        ...data[key]
    }));
};

export const addCustomer = async (customer: Omit<Customer, 'id'>) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const customersRef = ref(db, 'customers');
    try {
        const newCustomerRef = push(customersRef);
        await set(newCustomerRef, customer);
        const newId = newCustomerRef.key;
        if (newId) {
            await addAuditLog('create', 'customer', newId, `Created customer: ${customer.name}`);
        }
        return newId;
    } catch (e) {
        console.error("Error adding customer: ", e);
        throw new Error("Could not add customer");
    }
};

export const listenToCustomers = (callback: (customers: Customer[]) => void) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    const customersRef = ref(db, 'customers');
    return onValue(customersRef, (snapshot) => {
        const data = snapshot.val();
        const customers = dataToCustomerArray(data);
        callback(customers);
    });
};

export const updateCustomerBalance = async (customerId: string, amount: number) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const customerRef = ref(db, `customers/${customerId}`);
    try {
        await update(customerRef, {
            balance: increment(amount)
        });
        // Note: Logging for balance updates happens in higher-level functions (e.g., bookOrSellUnit)
    } catch (e) {
        console.error("Error updating customer balance: ", e);
        throw new Error("Could not update customer balance");
    }
};
