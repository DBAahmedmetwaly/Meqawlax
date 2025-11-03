
'use client';

import { db } from '@/lib/firebase';
import { ref, runTransaction } from 'firebase/database';

export type CounterType = 'purchaseInvoice' | 'inventoryWithdrawal';

const getPrefix = (type: CounterType): string => {
    switch (type) {
        case 'purchaseInvoice': return 'PUR';
        case 'inventoryWithdrawal': return 'WD';
        default: return 'GEN';
    }
}

export const getNextCounterValue = async (type: CounterType): Promise<string> => {
    if (!db) throw new Error("Firebase is not initialized.");

    const counterRef = ref(db, `counters/${type}`);
    let nextNumber = 0;
    
    try {
        await runTransaction(counterRef, (currentValue) => {
            if (currentValue === null) {
                // If it doesn't exist, initialize it to 1
                return 1;
            }
            // Otherwise, increment it
            return currentValue + 1;
        }, { applyLocally: false }); // Important for getting the final value

        const transactionResult = await runTransaction(counterRef, (currentValue) => {
             // This second transaction is just to read the committed value.
             // It's a bit of a workaround for RTDB transaction return value limitations.
            return currentValue;
        });

        if(transactionResult.committed) {
            const val = transactionResult.snapshot.val();
            // The value we want is the one *before* the increment in the second transaction read.
            // So we subtract 1 if it's not the initial value.
            nextNumber = val > 1 ? val -1 : 1;
             const prefix = getPrefix(type);
             //This is a workaround to make the transaction return the correct value
            const finalTransaction = await runTransaction(counterRef, (currentValue) => {
                nextNumber = currentValue;
                return currentValue;
            });
            if(finalTransaction.committed){
                nextNumber = finalTransaction.snapshot.val();
            }

            return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
        } else {
             throw new Error(`Failed to commit transaction for counter ${type}`);
        }
    } catch (error) {
        console.error("Transaction failed: ", error);
        throw new Error(`Could not get next counter value for ${type}`);
    }
     // Fallback if the logic above fails. This should not be reached.
    return `${getPrefix(type)}-${String(Date.now()).slice(-4)}`;
};

export const getNextSequentialNumber = (type: CounterType): Promise<string> => {
    const counterRef = ref(db, `counters/${type}`);
    
    return new Promise((resolve, reject) => {
        runTransaction(counterRef, (currentValue) => {
            if (currentValue === null) {
                return 1;
            }
            return currentValue + 1;
        }).then(result => {
            if (result.committed) {
                const prefix = getPrefix(type);
                const nextNumber = result.snapshot.val();
                resolve(`${prefix}-${String(nextNumber).padStart(4, '0')}`);
            } else {
                reject(new Error(`Failed to get next sequential number for ${type}: Transaction not committed.`));
            }
        }).catch(error => {
            console.error('Firebase transaction failed:', error);
            reject(error);
        });
    });
};
