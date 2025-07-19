'use client';

import React from 'react';
import { ExpenseForm } from '@/components/expense-form';
import { Dashboard } from '@/components/dashboard';
import { FormFlowLogo } from '@/components/formflow-logo';
import { type ExpenseWithId } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  const [records, setRecords] = React.useState<ExpenseWithId[]>([]);

  const addRecord = (newRecord: ExpenseWithId) => {
    setRecords(prevRecords => [newRecord, ...prevRecords]);
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <FormFlowLogo className="h-8 w-auto" />
        <p className="text-muted-foreground mt-2">
          Create forms, scan receipts, and visualize your data instantly.
        </p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-2">
          <ExpenseForm addRecord={addRecord} />
        </div>
        <div className="lg:col-span-3">
          <Dashboard records={records} />
        </div>
      </div>
      <footer className="text-center mt-12 text-muted-foreground text-sm">
        <Separator className="my-6" />
        <p>&copy; {new Date().getFullYear()} FormFlow Analytics. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
