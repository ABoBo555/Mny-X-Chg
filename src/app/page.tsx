'use client';

import React from 'react';
import { ExpenseForm } from '@/components/expense-form';
import { Dashboard } from '@/components/dashboard';
import { type ExpenseWithId } from '@/lib/types';
import { Toaster } from '@/components/ui/toaster';
import { FormFlowLogo } from '@/components/formflow-logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Home() {
  const [records, setRecords] = React.useState<ExpenseWithId[]>([]);

  const addRecord = (record: ExpenseWithId) => {
    setRecords(prevRecords => [...prevRecords, record]);
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

        <Tabs defaultValue="form" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form">Form</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>
          <TabsContent value="form">
            <div className="grid grid-cols-1 gap-8">
              <ExpenseForm addRecord={addRecord} />
            </div>
          </TabsContent>
          <TabsContent value="dashboard">
            <Dashboard records={records} />
          </TabsContent>
        </Tabs>

      </div>
      <Toaster />
    </main>
  );
}
