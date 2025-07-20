'use client';

import React from 'react';
import { collection, onSnapshot, query, orderBy, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ExpenseForm } from '@/components/expense-form';
import { Dashboard } from '@/components/dashboard';
import { type ExpenseWithId } from '@/lib/types';
import { Toaster } from '@/components/ui/toaster';
import { FormFlowLogo } from '@/components/formflow-logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const [records, setRecords] = React.useState<ExpenseWithId[]>([]);
  const [expenseToEdit, setExpenseToEdit] = React.useState<ExpenseWithId | null>(null);
  const [activeTab, setActiveTab] = React.useState('form');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [highlightedRecordId, setHighlightedRecordId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const expensesRef = collection(db, 'expenses');
    const q = query(expensesRef, orderBy('displayId', 'asc'));

    const unsubscribe = onSnapshot(
      q, 
      (snapshot: QuerySnapshot<DocumentData>) => {
        const newRecords = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date.toDate ? data.date.toDate() : new Date(data.date),
          } as ExpenseWithId;
        });
        setRecords(newRecords);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Firestore error:", err);
        setError("Failed to load data. Please check your Firestore security rules.");
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleSaveSuccess = (updatedRecord?: ExpenseWithId) => {
    if (updatedRecord && (updatedRecord.mmkServiceFee ?? 0) > 0) {
      setHighlightedRecordId(updatedRecord.id);
    } else {
      setHighlightedRecordId(null);
    }
    setExpenseToEdit(null);
    setActiveTab('dashboard');
  };

  const handleEdit = (record: ExpenseWithId) => {
    setExpenseToEdit(record);
    setHighlightedRecordId(null);
    setActiveTab('form');
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4 md:p-8 lg:p-12">
        <header className="flex items-center justify-between mb-8">
          <FormFlowLogo />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">
            Expense Tracker
          </h1>
        </header>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500">
            <p>{error}</p>
            <p>Please update your security rules in the Firebase console.</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="form">Form</TabsTrigger>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            </TabsList>
            <TabsContent value="form">
              <div className="grid grid-cols-1 gap-8">
                <ExpenseForm onSaveSuccess={handleSaveSuccess} expenseToEdit={expenseToEdit} />
              </div>
            </TabsContent>
            <TabsContent value="dashboard">
              <Dashboard records={records} onEdit={handleEdit} highlightedRecordId={highlightedRecordId} />
            </TabsContent>
          </Tabs>
        )}
      </div>
      <Toaster />
    </main>
  );
}
