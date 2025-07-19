'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Legend } from 'recharts';
import type { ExpenseWithId, ChartData } from '@/lib/types';
import { Badge } from './ui/badge';

interface DashboardProps {
  records: ExpenseWithId[];
}

const chartConfig = {
  total: {
    label: 'Total',
    color: 'hsl(var(--chart-1))',
  },
  'Food': { label: 'Food', color: 'hsl(var(--chart-1))' },
  'Travel': { label: 'Travel', color: 'hsl(var(--chart-2))' },
  'Office Supplies': { label: 'Office Supplies', color: 'hsl(var(--chart-3))' },
  'Other': { label: 'Other', color: 'hsl(var(--chart-4))' },
} satisfies ChartConfig;

const COLORS = Object.entries(chartConfig).filter(([key]) => key !== 'total').map(([, value]) => value.color);

export function Dashboard({ records }: DashboardProps) {
  const analytics = React.useMemo(() => {
    if (records.length === 0) {
      return {
        totalExpenses: 0,
        averageExpense: 0,
        transactionCount: 0,
        expensesByCategory: [],
      };
    }

    const totalExpenses = records.reduce((sum, record) => sum + record.amount, 0);
    const transactionCount = records.length;
    const averageExpense = totalExpenses / transactionCount;

    const expensesByCategory = records.reduce((acc, record) => {
      const category = record.category === 'Other' ? record.otherCategory || 'Other' : record.category;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += record.amount;
      return acc;
    }, {} as Record<string, number>);

    const chartData: ChartData = Object.entries(expensesByCategory).map(([name, total]) => ({
      name,
      total,
    }));

    return {
      totalExpenses,
      averageExpense,
      transactionCount,
      expensesByCategory: chartData,
    };
  }, [records]);

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center border-2 border-dashed rounded-lg bg-card">
        <div className="text-6xl mb-4" role="img" aria-label="chart icon">📊</div>
        <h3 className="text-2xl font-bold tracking-tight">Your Dashboard Awaits</h3>
        <p className="text-muted-foreground mt-2">Submit an expense record to see your data visualized here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Expenses</CardTitle>
            <CardDescription>Sum of all transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${analytics.totalExpenses.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg. Expense</CardTitle>
            <CardDescription>Average transaction amount</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${analytics.averageExpense.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>Total number of records</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.transactionCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
              <BarChart data={analytics.expensesByCategory} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <ChartTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center pb-0">
            <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie data={analytics.expensesByCategory} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {analytics.expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1">
            {records.slice(0, 5).map(record => (
              <li key={record.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-semibold">{record.vendor}</p>
                    <p className="text-sm text-muted-foreground">{new Date(record.transactionDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">${record.amount.toFixed(2)}</p>
                  <Badge variant="outline">{record.category === 'Other' ? record.otherCategory : record.category}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
