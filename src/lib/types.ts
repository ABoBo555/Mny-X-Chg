import { z } from 'zod';

export const expenseSchema = z.object({
  vendor: z.string().min(1, { message: 'Vendor is required.' }),
  transactionDate: z.date({ required_error: 'Transaction date is required.' }),
  amount: z.coerce.number().min(0.01, { message: 'Amount must be greater than 0.' }),
  category: z.enum(['Food', 'Travel', 'Office Supplies', 'Other']),
  isBusinessExpense: z.boolean().default(true),
  notes: z.string().optional().default(''),
  otherCategory: z.string().optional(),
}).refine(data => {
  if (data.category === 'Other') {
    return !!data.otherCategory && data.otherCategory.length > 0;
  }
  return true;
}, {
  message: 'Please specify the category',
  path: ['otherCategory'],
});

export type Expense = z.infer<typeof expenseSchema>;

export type ExpenseWithId = Expense & { id: string };

export type ChartData = {
  name: string;
  total: number;
}[];
