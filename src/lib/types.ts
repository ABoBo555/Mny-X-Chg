import { z } from 'zod';

export const expenseSchema = z.object({
  displayId: z.number().optional(), // This will be our auto-incrementing ID
  groupName: z.string().min(1, { message: 'Group Name is required.' }),
  date: z.date(),
  bankType: z.string().min(1, { message: 'Bank Type is required.' }),
  township: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  nrcNumber: z.string().optional(),
  name: z.string().optional(),
  phoneNumber: z.string().optional(),
  collectedAmount: z.coerce.number({invalid_type_error: "Collected Amount must be a number."}).min(0, { message: 'Collected Amount must be a non-negative number.' }).optional(),
  rmServiceFee: z.coerce.number({invalid_type_error: "RM Service Fee must be a number."}).min(0, { message: 'RM Service Fee must be a non-negative number.' }).optional(),
  rmTotalAmount: z.coerce.number({invalid_type_error: "RM Total Amount must be a number."}).min(0, { message: 'RM Total Amount must be a non-negative number.' }).optional(),
  buyingRate: z.coerce.number({invalid_type_error: "Buying Rate must be a number."}).min(0, { message: 'Buying Rate must be a non-negative number.' }).optional(),
  totalMmkTransferAmount: z.coerce.number().min(0, { message: 'Total MMK Transfer Amount must be a non-negative number.' }),
  mmkServiceFee: z.coerce.number({invalid_type_error: "MMK Service Fee must be a number."}).min(0, { message: 'MMK Service Fee must be a non-negative number.' }).optional(),
  mmkTotalAmount: z.coerce.number().min(0, { message: 'MMK Total Amount must be a non-negative number.' }).optional(),
  remark: z.string().optional().default(''),
  // Store file info (name and URL) instead of just the data
  uploadedFiles: z.array(z.object({
    name: z.string(),
    url: z.string(),
  })).optional(),
}).refine(data => data.collectedAmount !== undefined && data.collectedAmount !== null, {
  message: 'Collected Amount is required.',
  path: ['collectedAmount'],
}).refine(data => data.buyingRate !== undefined && data.buyingRate !== null, {
    message: 'Buying Rate is required.',
    path: ['buyingRate'],
});

export type Expense = z.infer<typeof expenseSchema>;

export type ExpenseWithId = Expense & {
  id: string; // This is the Firestore document ID
};

export type ChartData = {
  name:string;
  total: number;
}[];
