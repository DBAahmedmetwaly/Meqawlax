

import { db } from '@/lib/firebase';
import { ref, push, onValue, set, update, increment, child } from 'firebase/database';
import { format } from 'date-fns';
import { addAuditLog } from './auditLogService';

export interface Employee {
  id: string;
  name: string;
  jobId: string;
  position: string;
  salary: number;
  advances: number;
  custody: number;
  rewards: number;
  status: 'على رأس العمل' | 'إجازة' | 'مستقيل';
}

const dataToEmployeeArray = (data: any): Employee[] => {
    if (!data) return [];
    return Object.keys(data).map(key => ({
        id: key,
        ...data[key]
    }));
};

export const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    if (!db) throw new Error("Firebase is not initialized.");
    const employeesRef = ref(db, 'employees');
    try {
        const newEmployeeRef = push(employeesRef);
        await set(newEmployeeRef, employee);
        const newId = newEmployeeRef.key;
        if(newId) {
            await addAuditLog('create', 'employee', newId, `Created employee: ${employee.name}`);
        }
        return newId;
    } catch (e) {
        console.error("Error adding employee: ", e);
        throw new Error("Could not add employee");
    }
};

export const listenToEmployees = (callback: (employees: Employee[]) => void) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    const employeesRef = ref(db, 'employees');
    return onValue(employeesRef, (snapshot) => {
        const data = snapshot.val();
        const employees = dataToEmployeeArray(data);
        callback(employees);
    });
};

export const paySalaries = async (employees: Employee[], totalNetSalaries: number, accountId: string, accountName: string) => {
    if (!db) throw new Error("Firebase is not initialized.");
    try {
        const updates: { [key: string]: any } = {};

        // 1. Debit the treasury account
        updates[`/treasuryAccounts/${accountId}/balance`] = increment(-totalNetSalaries);

        // 2. Reset advances and rewards for all employees
        for (const emp of employees) {
            updates[`/employees/${emp.id}/advances`] = 0;
            updates[`/employees/${emp.id}/rewards`] = 0;
        }

        // 3. Create a single journal entry for the payroll
        const journalEntry = {
            date: format(new Date(), 'yyyy-MM-dd'),
            description: `مسير رواتب الموظفين`,
            debitAccount: 'مصروفات الرواتب والأجور',
            creditAccount: accountName,
            amount: totalNetSalaries,
        };
        const newJournalKey = push(child(ref(db), 'journalEntries')).key;
        updates[`/journalEntries/${newJournalKey}`] = journalEntry;
        
        await update(ref(db), updates);
        
        await addAuditLog('salary_payment', 'treasuryAccount', accountId, `Paid salaries of ${totalNetSalaries.toLocaleString()} from account ${accountName}.`);

    } catch (error) {
        console.error("Salary payment transaction failed: ", error);
        throw new Error("Could not process salary payments.");
    }
};
