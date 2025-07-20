import { z } from 'zod';

export const expenseSchema = z.object({
  groupName: z.string().min(1, { message: 'Group Name is required.' }),
  date: z.date(),
  bankType: z.string().min(1, { message: 'Bank Type is required.' }),
  bankAccountNumber: z.string().optional(),
  name: z.string().optional(),
  phoneNumber: z.string().optional(),
  collectedAmount: z.coerce.number({required_error: "Collected Amount is required.", invalid_type_error: "Collected Amount must be a number."}).min(0, { message: 'Collected Amount must be a non-negative number.' }),
  buyingRate: z.coerce.number({required_error: "Buying Rate is required.", invalid_type_error: "Buying Rate must be a number."}).min(0, { message: 'Buying Rate must be a non-negative number.' }),
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
