'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { expenseSchema, type Expense, type ExpenseWithId } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { X } from 'lucide-react';

interface ExpenseFormProps {
  addRecord: (record: ExpenseWithId) => void;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export function ExpenseForm({ addRecord }: ExpenseFormProps) {
  const { toast } = useToast();
  const [isReviewing, setIsReviewing] = React.useState(false);
  
  const form = useForm<Expense>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      groupName: '',
      bankType: '',
      bankAccountNumber: '',
      name: '',
      phoneNumber: '',
      collectedAmount: 0,
      buyingRate: 0,
      totalMmkTransferAmount: 0,
      remark: '',
      uploadedFiles: [],
    },
  });

  const { watch, setValue, getValues } = form;
  const watchedRmCollectedAmount = watch('collectedAmount');
  const watchedRmBuyingRate = watch('buyingRate');
  const uploadedFiles = watch('uploadedFiles');

  React.useEffect(() => {
    const total = (watchedRmCollectedAmount || 0) * (watchedRmBuyingRate || 0);
    setValue('totalMmkTransferAmount', total);
  }, [watchedRmCollectedAmount, watchedRmBuyingRate, setValue]);

  const handleRemoveImage = (index: number) => {
    const currentFiles = getValues('uploadedFiles') || [];
    const newFiles = currentFiles.filter((_, i) => i !== index);
    setValue('uploadedFiles', newFiles, { shouldValidate: true });
  };

  const onSubmit = async (data: Expense) => {
    const newRecord: ExpenseWithId = { ...data, id: new Date().toISOString() };
    addRecord(newRecord);
    form.reset();
    toast({
      title: 'Record Saved!',
      description: 'Your expense has been added and the dashboard is updated.',
    });
    setIsReviewing(false);
  };

  const handleReviewSubmit = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      setIsReviewing(true);
    }
  };

  const handleCancelReview = () => {
    setIsReviewing(false);
  };

  const handleClearForm = () => {
    form.reset();
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle>Add Expense Record</CardTitle>
        <CardDescription>Fill out the form below.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="groupName" render={({ field }) => ( <FormItem> <FormLabel>Group Name</FormLabel> <FormControl><Input placeholder="Enter Group Name" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="bankType" render={({ field }) => ( <FormItem> <FormLabel>Bank Type</FormLabel> <FormControl><Input placeholder="Enter Bank Type" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="bankAccountNumber" render={({ field }) => ( <FormItem> <FormLabel>Bank Account Number</FormLabel> <FormControl><Input placeholder="Enter Bank Account Number" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Name</FormLabel> <FormControl><Input placeholder="Enter Name" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="phoneNumber" render={({ field }) => ( <FormItem> <FormLabel>Phone Number</FormLabel> <FormControl><Input placeholder="Enter Phone Number" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="collectedAmount" render={({ field }) => ( <FormItem> <FormLabel>Collected Amount</FormLabel> <FormControl><Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="buyingRate" render={({ field }) => ( <FormItem> <FormLabel>Buying Rate</FormLabel> <FormControl><Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="totalMmkTransferAmount" render={({ field }) => ( <FormItem> <FormLabel>Total MMK Transfer Amount</FormLabel> <FormControl><Input type="number" placeholder="0" {...field} disabled value={field.value || ''} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="remark" render={({ field }) => ( <FormItem> <FormLabel>Remark</FormLabel> <FormControl><Textarea placeholder="Add any remarks" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            
            <FormField
              control={form.control}
              name="uploadedFiles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt Image</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      multiple
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (files) {
                          const fileInfo = await Promise.all(
                            Array.from(files).map(async (file) => {
                              const url = await fileToBase64(file);
                              return { name: file.name, url };
                            })
                          );
                          field.onChange(fileInfo);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  {uploadedFiles && uploadedFiles.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="relative">
                          <img src={file.url} alt={file.name} className="rounded-md object-contain w-full h-full" />
                          <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => handleRemoveImage(index)}> <X className="h-4 w-4" /> </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </FormItem>
              )}
            />
            
            <div className="flex space-x-4">
                <AlertDialog open={isReviewing} onOpenChange={setIsReviewing}>
                    <AlertDialogTrigger asChild>
                        <Button type="button" className="flex-1 text-lg py-6" onClick={handleReviewSubmit}>Review Info & Submit</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Review Your Submission</AlertDialogTitle>
                            <AlertDialogDescription>
                                Please check the details carefully before submitting.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="max-h-64 overflow-y-auto pr-4 text-sm">
                            <div className="space-y-1">
                                <div><strong>Group Name:</strong> {watch('groupName')}</div>
                                <div><strong>Bank Type:</strong> {watch('bankType')}</div>
                                <div><strong>Bank Account No.:</strong> {watch('bankAccountNumber')}</div>
                                <div><strong>Name:</strong> {watch('name')}</div>
                                <div><strong>Phone Number:</strong> {watch('phoneNumber')}</div>
                                <div><strong>Collected Amount:</strong> {watch('collectedAmount')}</div>
                                <div><strong>Buying Rate:</strong> {watch('buyingRate')}</div>
                                <div><strong>Total MMK Amount:</strong> {watch('totalMmkTransferAmount')}</div>
                                {watch('remark') && <div><strong>Remark:</strong> {watch('remark')}</div>}
                                {uploadedFiles && uploadedFiles.length > 0 && (
                                    <div><strong>Files:</strong> {uploadedFiles.map(f => f.name).join(', ')}</div>
                                )}
                            </div>
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={handleCancelReview}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={form.handleSubmit(onSubmit)}>Submit</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Button type="button" variant="outline" className="flex-1 text-lg py-6" onClick={handleClearForm}>Clear</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
