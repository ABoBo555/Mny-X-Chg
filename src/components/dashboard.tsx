'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Legend } from 'recharts';
import type { ExpenseWithId, ChartData } from '@/lib/types';
import { Button } from './ui/button';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { FilePenLine, Trash2 } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';
import { doc, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface DashboardProps {
  records: ExpenseWithId[];
  onEdit: (record: ExpenseWithId) => void;
  highlightedRecordId: string | null;
}

const chartConfig = {
  total: {
    label: 'Total',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943'];

// Helper to format numbers with commas
const formatNumber = (num: number | undefined | null) => {
  if (num === undefined || num === null) return '0';
  return new Intl.NumberFormat('en-US').format(num);
};

// Main Dashboard Component
export function Dashboard({ records, onEdit, highlightedRecordId }: DashboardProps) {
  const { toast } = useToast();
  const [selectedImageUrl, setSelectedImageUrl] = React.useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = React.useState<ExpenseWithId | null>(null);

  const analytics = React.useMemo(() => {
    const totalCollected = records.reduce((acc, record) => acc + (record.collectedAmount || 0), 0);
    const totalMMK = records.reduce((acc, record) => acc + (record.mmkTotalAmount || record.totalMmkTransferAmount || 0), 0);
    
    const expensesByCategory = records.reduce((acc, record) => {
      const category = record.bankType || 'N/A';
      const existing = acc.find(item => item.name === category);
      if (existing) {
        existing.total += record.collectedAmount || 0;
      } else {
        acc.push({ name: category, total: record.collectedAmount || 0 });
      }
      return acc;
    }, [] as ChartData);

    const expensesByGroup = records.reduce((acc, record) => {
      const group = record.groupName || 'N/A';
      const existing = acc.find(item => item.name === group);
      if (existing) {
        existing.total += record.collectedAmount || 0;
      } else {
        acc.push({ name: group, total: record.collectedAmount || 0 });
      }
      return acc;
    }, [] as ChartData);

    return { totalCollected, totalMMK, expensesByCategory, expensesByGroup };
  }, [records]);
  
  const updatedChartConfig = React.useMemo(() => {
    const config: ChartConfig = { ...chartConfig };
    [...analytics.expensesByCategory, ...analytics.expensesByGroup].forEach((item, index) => {
        if (!config[item.name]) {
            config[item.name] = {
                label: item.name,
                color: COLORS[index % COLORS.length],
            };
        }
    });
    return config;
  }, [analytics.expensesByCategory, analytics.expensesByGroup]);

  const handleExportToXLSX = () => {
    const worksheet = XLSX.utils.json_to_sheet(records.map((record) => ({
      ID: record.displayId,
      'Group Name': record.groupName,
      'Date': record.date ? new Date(record.date).toLocaleDateString() : 'N/A',
      'Bank Type': record.bankType,
      'Township (Bank Branch)': record.township,
      'Bank Account Number': record.bankAccountNumber,
      'NRC Number': record.nrcNumber,
      'Name': record.name,
      'Phone Number': record.phoneNumber,
      'RM Collected Amount': record.collectedAmount,
      'RM Service Fee': record.rmServiceFee,
      'RM Total Amount': record.rmTotalAmount,
      'Buying Rate': record.buyingRate,
      'MMK Transfer Amount': record.totalMmkTransferAmount,
      'MMK Service Fee': record.mmkServiceFee,
      'MMK Total Amount': record.mmkTotalAmount,
      'Remark': record.remark,
      'Images': record.uploadedFiles?.map(f => f.name).join(', '),
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, 'transactions.xlsx');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedImageUrl(null);
    }
  };

  const handleDelete = async () => {
    if (recordToDelete) {
      try {
        await runTransaction(db, async (transaction) => {
          const counterRef = doc(db, 'counters', 'expenses');
          const expenseRef = doc(db, 'expenses', recordToDelete.id);
          
          const counterDoc = await transaction.get(counterRef);
          if (!counterDoc.exists()) {
            throw "Counter document does not exist!";
          }

          transaction.delete(expenseRef);

          const lastId = counterDoc.data().lastId;
          if (recordToDelete.displayId === lastId) {
            transaction.update(counterRef, { lastId: lastId - 1 });
          }
        });

        toast({
          title: 'Record Deleted',
          description: 'The expense record has been successfully deleted.',
        });
      } catch (error) {
        console.error("Error deleting document: ", error);
        toast({
          variant: 'destructive',
          title: 'Delete Failed',
          description: 'An error occurred while deleting the record.',
        });
      } finally {
        setRecordToDelete(null);
      }
    }
  };

  return (
    <>
      <Dialog open={!!selectedImageUrl} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex items-center justify-center p-2">
            <DialogHeader>
                <DialogTitle className="sr-only">Enlarged Image View</DialogTitle>
            </DialogHeader>
            {selectedImageUrl && (
                <img src={selectedImageUrl} alt="Enlarged view" className="max-w-full max-h-full object-contain rounded-md" />
            )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!recordToDelete} onOpenChange={(isOpen) => !isOpen && setRecordToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the record for {recordToDelete?.groupName} - {recordToDelete?.name}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => setRecordToDelete(null)}>Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card><CardHeader><CardTitle>Total Records</CardTitle><CardDescription>{records.length} transactions</CardDescription></CardHeader></Card>
              <Card><CardHeader><CardTitle>Total Collected</CardTitle><CardDescription>RM {formatNumber(analytics.totalCollected)}</CardDescription></CardHeader></Card>
              <Card><CardHeader><CardTitle>Total MMK Transfer</CardTitle><CardDescription>MMK {formatNumber(analytics.totalMMK)}</CardDescription></CardHeader></Card>
              <Card><CardHeader><CardTitle>Avg. Buying Rate</CardTitle><CardDescription>{records.length > 0 && analytics.totalCollected > 0 ? (analytics.totalMMK / analytics.totalCollected).toFixed(2) : '0.00'}</CardDescription></CardHeader></Card>
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
                    <TableHead>ID</TableHead><TableHead>Group</TableHead><TableHead>Bank</TableHead><TableHead>Township</TableHead><TableHead>Account No.</TableHead><TableHead>NRC</TableHead><TableHead>Name</TableHead><TableHead>RM Collected Amount</TableHead><TableHead>RM Service Fee</TableHead><TableHead>RM Total Amount</TableHead><TableHead>Buying Rate</TableHead><TableHead>MMK Transfer Amount</TableHead><TableHead>MMK Service Fee</TableHead><TableHead>MMK Total Amount</TableHead><TableHead>Remark</TableHead><TableHead>Images</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} className={highlightedRecordId === record.id ? 'bg-green-100' : ''}>
                      <TableCell>{record.displayId}</TableCell>
                      <TableCell>{record.groupName}</TableCell><TableCell>{record.bankType}</TableCell><TableCell>{record.township}</TableCell><TableCell>{record.bankAccountNumber}</TableCell><TableCell>{record.nrcNumber}</TableCell><TableCell>{record.name}</TableCell>
                      <TableCell>{formatNumber(record.collectedAmount)}</TableCell>
                      <TableCell>{formatNumber(record.rmServiceFee)}</TableCell>
                      <TableCell>{formatNumber(record.rmTotalAmount)}</TableCell>
                      <TableCell>{formatNumber(record.buyingRate)}</TableCell><TableCell>{formatNumber(record.totalMmkTransferAmount)}</TableCell>
                      <TableCell>{formatNumber(record.mmkServiceFee)}</TableCell><TableCell>{formatNumber(record.mmkTotalAmount)}</TableCell>
                      <TableCell>{record.remark}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {record.uploadedFiles?.map((file, idx) => (
                            <button key={idx} onClick={() => setSelectedImageUrl(file.url)} className="focus:outline-none">
                              <img src={file.url} alt={file.name} className="h-10 w-10 rounded-md object-cover transition-transform hover:scale-110 cursor-pointer"/>
                            </button>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => onEdit(record)}><FilePenLine className="h-4 w-4" /></Button>
                          <Button variant="destructive" size="icon" onClick={() => setRecordToDelete(record)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Collected Amount by Bank</CardTitle></CardHeader>
              <CardContent><ChartContainer config={updatedChartConfig} className="min-h-[300px] w-full"><BarChart data={analytics.expensesByCategory} accessibilityLayer><CartesianGrid vertical={false} /><XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} /><YAxis tickFormatter={(value) => `RM ${value}`} /><ChartTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} /><Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart></ChartContainer></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Bank Distribution</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center pb-0"><ChartContainer config={updatedChartConfig} className="min-h-[300px] w-full"><PieChart><ChartTooltip content={<ChartTooltipContent hideLabel />} /><Pie data={analytics.expensesByCategory} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>{analytics.expensesByCategory.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Legend /></PieChart></ChartContainer></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Collected Amount by Group</CardTitle></CardHeader>
              <CardContent><ChartContainer config={updatedChartConfig} className="min-h-[300px] w-full"><BarChart data={analytics.expensesByGroup} accessibilityLayer><CartesianGrid vertical={false} /><XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} /><YAxis tickFormatter={(value) => `RM ${value}`} /><ChartTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} /><Bar dataKey="total" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} /></BarChart></ChartContainer></CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}
