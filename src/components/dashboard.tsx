'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Legend } from 'recharts';
import type { ExpenseWithId, ChartData } from '@/lib/types';
import { Button } from './ui/button';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

interface DashboardProps {
  records: ExpenseWithId[];
}

const chartConfig = {
  total: {
    label: 'Total',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943'];

export function Dashboard({ records }: DashboardProps) {
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);

  const analytics = React.useMemo(() => {
    if (records.length === 0) {
      return {
        totalExpenses: 0,
        averageExpense: 0,
        transactionCount: 0,
        expensesByCategory: [],
      };
    }

    const totalExpenses = records.reduce((sum, record) => sum + (record.collectedAmount || 0), 0);
    const transactionCount = records.length;
    const averageExpense = transactionCount > 0 ? totalExpenses / transactionCount : 0;

    const expensesByCategory = records.reduce((acc, record) => {
      const category = record.bankType || 'Unknown Bank';
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += record.collectedAmount || 0;
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

  const updatedChartConfig = React.useMemo(() => {
    const dynamicColors: Record<string, { label: string; color: string }> = {};
    analytics.expensesByCategory.forEach((entry, index) => {
      dynamicColors[entry.name] = { label: entry.name, color: COLORS[index % COLORS.length] };
    });
    return { ...chartConfig, ...dynamicColors };
  }, [analytics.expensesByCategory]);

  const handleExportToXLSX = async () => {
    const dataToExport = records.map(record => {
      let uploadedFilesText = '';
      if (record.uploadedFiles && record.uploadedFiles.length > 0) {
        uploadedFilesText = record.uploadedFiles.map(file => file.name).join(', ');
      }
      
      return {
        'Group Name': record.groupName,
        'Bank Type': record.bankType,
        'Bank Account Number': record.bankAccountNumber,
        'Name': record.name,
        'Phone Number': record.phoneNumber,
        'Collected Amount': record.collectedAmount,
        'Buying Rate': record.buyingRate,
        'Total MMK Transfer Amount': record.totalMmkTransferAmount,
        'Uploaded Files': uploadedFilesText,
        'Remark': record.remark,
        'Timestamp': new Date(record.id).toLocaleString(),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, 'transaction_data.xlsx');
  };

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center border-2 border-dashed rounded-lg bg-card">
        <div className="text-6xl mb-4" role="img" aria-label="chart icon">📊</div>
        <h3 className="text-2xl font-bold tracking-tight">Your Dashboard Awaits</h3>
        <p className="text-muted-foreground mt-2">Submit a record to see your data visualized here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Selected" className="max-h-[90vh] max-w-[90vw] rounded-lg" />
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Total Collected Amount</CardTitle><CardDescription>Sum of all transactions</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold">{analytics.totalExpenses.toFixed(2)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Avg. Transaction</CardTitle><CardDescription>Average transaction amount</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold">{analytics.averageExpense.toFixed(2)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Transactions</CardTitle><CardDescription>Total number of records</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold">{analytics.transactionCount}</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Collected Amount by Bank</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={updatedChartConfig} className="min-h-[250px] w-full">
              <BarChart data={analytics.expensesByCategory} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis tickFormatter={(value) => `RM ${value}`} />
                <ChartTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Bank Distribution</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center pb-0">
            <ChartContainer config={updatedChartConfig} className="min-h-[250px] w-full">
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
        <CardHeader className="flex-row justify-between items-center">
          <CardTitle>All Transactions</CardTitle>
          <Button onClick={handleExportToXLSX} size="sm">Export to XLSX</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group Name</TableHead>
                <TableHead>Bank Type</TableHead>
                <TableHead>Bank Acc No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone No.</TableHead>
                <TableHead>Collected</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Total MMK</TableHead>
                <TableHead>Images</TableHead>
                <TableHead>Remark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map(record => (
                <TableRow key={record.id}>
                  <TableCell>{record.groupName}</TableCell>
                  <TableCell>{record.bankType}</TableCell>
                  <TableCell>{record.bankAccountNumber}</TableCell>
                  <TableCell>{record.name}</TableCell>
                  <TableCell>{record.phoneNumber}</TableCell>
                  <TableCell>{record.collectedAmount.toFixed(2)}</TableCell>
                  <TableCell>{record.buyingRate.toFixed(2)}</TableCell>
                  <TableCell>{record.totalMmkTransferAmount.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {record.uploadedFiles && record.uploadedFiles.length > 0
                        ? record.uploadedFiles.map((file, index) => (
                            <img
                              key={index}
                              src={file.url}
                              alt={file.name}
                              className="h-10 w-10 cursor-pointer rounded-md object-cover"
                              onClick={() => setSelectedImage(file.url)}
                            />
                          ))
                        : 'No files'}
                    </div>
                  </TableCell>
                  <TableCell>{record.remark || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
