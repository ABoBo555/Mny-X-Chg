import { z } from 'zod';

export const expenseSchema = z.object({
  groupName: z.string().regex(/^[a-zA-Z0-9]+$/, { message: 'Group Name must be alphanumeric.' }),
  bankType: z.string().regex(/^[a-zA-Z0-9]+$/, { message: 'Bank Type must be alphanumeric.' }),
  bankAccountNumber: z.string().min(1, { message: 'Bank Account Number is required.' }),
  name: z.string().min(1, { message: 'Name is required.' }),
  phoneNumber: z.string().min(1, { message: 'Phone Number is required.' }),
  collectedAmount: z.coerce.number().min(0, { message: 'Collected Amount must be a non-negative number.' }),
  buyingRate: z.coerce.number().min(0, { message: 'Buying Rate must be a non-negative number.' }),
  totalMmkTransferAmount: z.coerce.number().min(0, { message: 'Total MMK Transfer Amount must be a non-negative number.' }),
  remark: z.string().optional().default(''),
  // Store file info (name and URL) instead of just the data
  uploadedFiles: z.array(z.object({
    name: z.string(),
    url: z.string(),
  })).optional(),
});

export type Expense = z.infer<typeof expenseSchema>;

export type ExpenseWithId = Expense & {
  id: string;
};

export type ChartData = {
  name:string;
  total: number;
}[];
