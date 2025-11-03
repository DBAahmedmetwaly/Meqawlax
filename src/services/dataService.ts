
import { db } from '@/lib/firebase';
import { ref, get, set, child, update } from 'firebase/database';
import { format } from 'date-fns';

export const backupData = async (): Promise<string> => {
    if (!db) throw new Error("Firebase is not initialized.");
    const dbRef = ref(db);
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
        return JSON.stringify(snapshot.val(), null, 2);
    }
    return "{}";
};


export const deleteAllData = async () => {
    if (!db) throw new Error("Firebase is not initialized.");
    
    const keysToDelete = [
        'projects',
        'expenses',
        'customers',
        'suppliers',
        'employees',
        'items',
        'purchases',
        'treasuryAccounts',
        'journalEntries',
        'settings',
        'budgetItems',
        'expenseTypes',
        'installments',
        'counters',
        'partners'
    ];

    const updates: { [key: string]: null } = {};
    keysToDelete.forEach(key => {
        updates[key] = null;
    });

    try {
        await update(ref(db), updates);
    } catch (error) {
        console.error("Selective data deletion failed: ", error);
        throw new Error("Could not delete all data except users and jobs.");
    }
};


const getSampleData = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const formatForDB = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const data = {
      "projects": {
        "proj_1": { "budget": 750000, "description": "إنشاء وتجهيز برج سكني من 10 طوابق مع مواقف سيارات تحت الأرض.", "name": "مشروع برج النخبة السكني", "spent": 325000, "startDate": "2023-05-15", "status": "نشط" },
        "proj_2": { "budget": 1200000, "description": "تطوير وبناء مجمع تجاري متكامل يضم محلات تجارية ومكاتب إدارية.", "name": "مشروع الواحة مول", "spent": 950000, "startDate": "2023-01-20", "status": "نشط" },
        "proj_3": { "budget": 300000, "description": "بناء فيلا دوبلكس بتصميم عصري في حي الربيع.", "name": "مشروع فيلا الربيع", "spent": 300000, "startDate": "2022-09-10", "status": "مكتمل" },
        "proj_4": { "budget": 500000, "description": "مشروع بناء مسجد يتسع لـ 500 مصلي مع ملحقاته.", "name": "مشروع مسجد الهدى", "spent": 480000, "startDate": "2023-03-01", "status": "مجمد" }
      },
      "expenses": {
        "exp_1": { "amount": 7500, "date": formatForDB(today), "description": "شراء حديد تسليح 5 طن", "projectId": "proj_1", "type": "مواد بناء" },
        "exp_2": { "amount": 2200, "date": formatForDB(today), "description": "أجرة شيول ليوم عمل", "projectId": "proj_2", "type": "معدات" },
        "exp_3": { "amount": 1500, "date": formatForDB(yesterday), "description": "رسوم استخراج رخصة بناء", "projectId": "proj_1", "type": "تراخيص" }
      },
      "customers": {
        "cust_1": { "balance": 150000, "name": "شركة الاستثمار العقاري", "status": "مستحق" },
        "cust_2": { "balance": 0, "name": "مجموعة صالح السكنية", "status": "مسدد" },
        "cust_3": { "balance": 45000, "name": "عبدالله بن فهد", "status": "متأخر" }
      },
      "suppliers": {
        "sup_1": { "balance": 35000, "name": "شركة مواد الإعمار المتحدة" },
        "sup_2": { "balance": 12800, "name": "مؤسسة التجهيزات الصناعية" },
        "sup_3": { "balance": 0, "name": "الرواد للحديد والصلب" }
      },
      "jobs": {
        "job_1": { "salary": 12000, "title": "مدير مشروع" },
        "job_2": { "salary": 8000, "title": "مهندس موقع" },
        "job_3": { "salary": 6000, "title": "محاسب" },
        "job_4": { "salary": 4500, "title": "مشرف عمال" },
        "job_5": { "salary": 3000, "title": "عامل" }
      },
      "employees": {
        "emp_1": { "advances": 1000, "custody": 500, "jobId": "job_1", "name": "خالد الغامدي", "position": "مدير مشروع", "rewards": 500, "salary": 12000, "status": "على رأس العمل" },
        "emp_2": { "advances": 0, "custody": 0, "jobId": "job_2", "name": "سالم الجهني", "position": "مهندس موقع", "rewards": 0, "salary": 8000, "status": "على رأس العمل" },
        "emp_3": { "advances": 300, "custody": 0, "jobId": "job_3", "name": "أيمن السيد", "position": "محاسب", "rewards": 0, "salary": 6000, "status": "على رأس العمل" }
      },
      "items": {
        "item_1": { "cost": 16.5, "name": "كيس أسمنت مقاوم 50 كجم", "stock": 500, "unit": "كيس" },
        "item_2": { "cost": 2800, "name": "حديد تسليح 16 ملم", "stock": 25, "unit": "طن" },
        "item_3": { "cost": 90, "name": "متر مكعب خرسانة جاهزة", "stock": 150, "unit": "متر" },
        "item_4": { "cost": 4, "name": "بلوك أسمنتي 20 سم", "stock": 2500, "unit": "حبة" }
      },
      "purchases": {
          "pur_1": {
              "date": formatForDB(yesterday),
              "invoiceNumber": "INV-2024-101",
              "supplierId": "sup_1",
              "supplierName": "شركة مواد الإعمار المتحدة",
              "totalAmount": 1650,
              "items": [
                  { "itemId": "item_1", "quantity": 100, "price": 16.5, "total": 1650 }
              ]
          }
      },
      "treasuryAccounts": {
        "acc_1": { "balance": 250000, "name": "خزينة المكتب الرئيسية", "type": "خزينة" },
        "acc_2": { "balance": 1250000, "name": "حساب بنك الراجحي", "type": "بنك" }
      },
      "journalEntries": {
        "jrn_1": { "amount": 7500, "creditAccount": "خزينة المكتب الرئيسية", "date": formatForDB(today), "debitAccount": "مصروفات مشروع - مواد بناء", "description": "مصروف لمشروع برج النخبة: شراء حديد تسليح 5 طن" },
        "jrn_2": { "amount": 1650, "creditAccount": "ذمم دائنة - الموردين", "date": formatForDB(yesterday), "debitAccount": "المخزون", "description": "فاتورة شراء رقم INV-2024-101 من المورد شركة مواد الإعمار المتحدة" }
      },
      "users": {
        "user_1": { "email": "admin@bana-i.com", "name": "المدير العام", "permissions": ["/","/projects","/projects/manage","/expenses","/journal","/treasury","/reports/general-ledger","/customers","/suppliers","/employees","/jobs","/salaries","/reports","/users","/settings","/inventory","/purchases", "/settings"], "status": "نشط" }
      },
      "settings": {
        "global": { "currency": "EGP" }
      }
    };

    return data;
};


export const seedTestData = async () => {
    if (!db) throw new Error("Firebase is not initialized.");
    
    await deleteAllData();
    
    const dataToSeed = getSampleData();
    const dbRef = ref(db);
    
    // Seed all data except users and jobs, which should be preserved
    const updates: {[key: string]: any} = {};
    for (const key in dataToSeed) {
        if (key !== 'users' && key !== 'jobs') {
            updates[key] = (dataToSeed as any)[key];
        }
    }

    await update(dbRef, updates);
};
