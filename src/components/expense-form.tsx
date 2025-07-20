'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, doc, runTransaction, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { expenseSchema, type Expense, type ExpenseWithId } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { X, CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface ExpenseFormProps {
  onSaveSuccess: (updatedRecord?: ExpenseWithId) => void;
  expenseToEdit: ExpenseWithId | null;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return '0';
    return new Intl.NumberFormat('en-US').format(num);
};

const defaultFormValues: Omit<Expense, 'id'> = {
  displayId: 0,
  groupName: '',
  date: new Date(),
  bankType: '',
  township: '',
  bankAccountNumber: '',
  nrcNumber: '',
  name: '',
  phoneNumber: '',
  collectedAmount: undefined,
  rmServiceFee: undefined,
  rmTotalAmount: 0,
  buyingRate: undefined,
  totalMmkTransferAmount: 0,
  mmkServiceFee: undefined,
  mmkTotalAmount: 0,
  remark: '',
  uploadedFiles: [],
};

// Helper function to remove undefined properties from an object
const removeUndefinedProps = (obj: any) => {
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) {
        newObj[key] = obj[key];
      }
    });
    return newObj;
};

function ExpenseFormContent({ onSaveSuccess, expenseToEdit }: ExpenseFormProps) {
  const { toast } = useToast();
  const [isReviewing, setIsReviewing] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showErrorAlert, setShowErrorAlert] = React.useState(false);
  const [errorMessages, setErrorMessages] = React.useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<Expense>({
    resolver: zodResolver(expenseSchema),
    defaultValues: expenseToEdit
      ? { ...expenseToEdit, date: new Date(expenseToEdit.date) }
      : defaultFormValues,
  });

  const { watch, setValue, getValues, formState: { errors }, reset } = form;
  const uploadedFiles = watch('uploadedFiles');
  const watchedRmCollectedAmount = watch('collectedAmount');
  const watchedRmServiceFee = watch('rmServiceFee');
  const watchedRmBuyingRate = watch('buyingRate');
  const watchedTotalMmkTransferAmount = watch('totalMmkTransferAmount');
  const watchedMmkServiceFee = watch('mmkServiceFee');

  React.useEffect(() => {
    const total = (watchedRmCollectedAmount || 0) * (watchedRmBuyingRate || 0);
    setValue('totalMmkTransferAmount', total);
  }, [watchedRmCollectedAmount, watchedRmBuyingRate, setValue]);

  React.useEffect(() => {
    const totalWithFee = (watchedTotalMmkTransferAmount || 0) + (watchedMmkServiceFee || 0);
    setValue('mmkTotalAmount', totalWithFee);
  }, [watchedTotalMmkTransferAmount, watchedMmkServiceFee, setValue]);
  
  React.useEffect(() => {
    const total = (watchedRmCollectedAmount || 0) + (watchedRmServiceFee || 0);
    setValue('rmTotalAmount', total);
  }, [watchedRmCollectedAmount, watchedRmServiceFee, setValue]);

  const handleRemoveImage = (index: number) => {
    const currentFiles = getValues('uploadedFiles') || [];
    const newFiles = currentFiles.filter((_, i) => i !== index);
    setValue('uploadedFiles', newFiles, { shouldValidate: true });
  };

  const onSubmit = async (data: Expense) => {
    setIsSubmitting(true);
    const cleanData = removeUndefinedProps(data);

    try {
      let updatedRecord: ExpenseWithId | undefined;
      if (expenseToEdit) {
        const docRef = doc(db, 'expenses', expenseToEdit.id);
        await updateDoc(docRef, cleanData);
        updatedRecord = { ...expenseToEdit, ...cleanData };
      } else {
        await runTransaction(db, async (transaction) => {
          const counterRef = doc(db, 'counters', 'expenses');
          const counterDoc = await transaction.get(counterRef);
          
          let newId = 1;
          if (counterDoc.exists()) {
            newId = counterDoc.data().lastId + 1;
          }

          const newExpenseRef = doc(collection(db, 'expenses'));
          transaction.set(newExpenseRef, { ...cleanData, displayId: newId });
          transaction.set(counterRef, { lastId: newId }, { merge: true });
        });
      }

      toast({
        title: 'Record Saved!',
        description: `Your expense has been ${expenseToEdit ? 'updated' : 'added'}.`,
      });
      
      reset(defaultFormValues);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onSaveSuccess(updatedRecord);

    } catch (error) {
      console.error("Error saving document: ", error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'An error occurred while saving the record. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
      setIsReviewing(false);
    }
  };

  const handleReviewSubmit = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      setIsReviewing(true);
    } else {
      const errorKeys = Object.keys(errors) as (keyof Expense)[];
      const messages = errorKeys.map(key => errors[key]?.message).filter(Boolean) as string[];
      setErrorMessages(messages);
      setShowErrorAlert(true);
    }
  };

  const handleCancelReview = () => {
    setIsReviewing(false);
  };

  const handleClearForm = () => {
    reset(defaultFormValues);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onShowErrorAlertChange = (open: boolean) => {
    if (!open) {
      setErrorMessages([]);
    }
    setShowErrorAlert(open);
  };

  return (
    <>
      <AlertDialog open={showErrorAlert} onOpenChange={onShowErrorAlertChange}>
        <AlertDialogContent className="bg-red-50">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-red-800">Validation Error</AlertDialogTitle>
                <AlertDialogDescription asChild className="text-red-700">
                  <div>
                    Please fill out all required fields before submitting.
                    <ul className="list-disc pl-5 mt-2">
                        {errorMessages.map((msg, i) => <li key={i}>{msg}</li>)}
                    </ul>
                  </div>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogAction onClick={() => setShowErrorAlert(false)} className="bg-red-600 hover:bg-red-700">OK</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle>{expenseToEdit ? 'Edit Expense Record' : 'Add Expense Record'}</CardTitle>
          <CardDescription>Fill out the form below. <span className="text-red-500">(* indicates required)</span></CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
                control={form.control}
                name="groupName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="GP1">GP1</SelectItem>
                        <SelectItem value="GP2">GP2</SelectItem>
                        <SelectItem value="GP3">GP3</SelectItem>
                        <SelectItem value="GP4">GP4</SelectItem>
                        <SelectItem value="GP5">GP5</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Propose Date <span className="text-red-500">*</span></FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className="w-full pl-3 text-left font-normal"
                            disabled={isSubmitting}
                          >
                            {field.value ? (
                              format(new Date(field.value), 'EEE-dd-MMM-yyyy')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={field.onChange}
                          initialFocus
                          disabled={isSubmitting}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bankType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Type <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a bank" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="KBZ Bank">KBZ Bank</SelectItem>
                        <SelectItem value="KPay">KPay</SelectItem>
                        <SelectItem value="CB Bank">CB Bank</SelectItem>
                        <SelectItem value="AGD Bank">AGD Bank</SelectItem>
                        <SelectItem value="AYA Bank">AYA Bank</SelectItem>
                        <SelectItem value="GT Bank">GT Bank</SelectItem>
                        <SelectItem value="MAB Bank">MAB Bank</SelectItem>
                        <SelectItem value="UAB Bank">UAB Bank</SelectItem>
                        <SelectItem value="YOMA Bank">YOMA Bank</SelectItem>
                        <SelectItem value="Wave Account">Wave Account</SelectItem>
                        <SelectItem value="Wave Shop">Wave Shop</SelectItem>
                        <SelectItem value="Phone Bill">Phone Bill</SelectItem>
                        <SelectItem value="Cash Delivery">Cash Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="township" render={({ field }) => ( <FormItem> <FormLabel>Township (Bank Branch)</FormLabel> <FormControl><Input placeholder="Enter Township" {...field} value={field.value || ''} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="bankAccountNumber" render={({ field }) => ( <FormItem> <FormLabel>Bank Account Number</FormLabel> <FormControl><Input placeholder="Enter Bank Account Number" {...field} value={field.value || ''} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="nrcNumber" render={({ field }) => ( <FormItem> <FormLabel>NRC Number</FormLabel> <FormControl><Input placeholder="Enter NRC Number" {...field} value={field.value || ''} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Name</FormLabel> <FormControl><Input placeholder="Enter Name" {...field} value={field.value || ''} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="phoneNumber" render={({ field }) => ( <FormItem> <FormLabel>Phone Number</FormLabel> <FormControl><Input placeholder="Enter Phone Number" {...field} value={field.value || ''} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="collectedAmount" render={({ field }) => ( <FormItem> <FormLabel>Collected Amount <span className="text-red-500">*</span></FormLabel> <FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="rmServiceFee" render={({ field }) => ( <FormItem> <FormLabel>RM Service Fee</FormLabel> <FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="rmTotalAmount" render={({ field }) => ( <FormItem> <FormLabel>RM Total Amount</FormLabel> <FormControl><Input type="number" placeholder="0" {...field} disabled value={field.value || ''} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="buyingRate" render={({ field }) => ( <FormItem> <FormLabel>Buying Rate <span className="text-red-500">*</span></FormLabel> <FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="totalMmkTransferAmount" render={({ field }) => ( <FormItem> <FormLabel>Total MMK Transfer Amount</FormLabel> <FormControl><Input type="number" placeholder="0" {...field} disabled value={field.value || ''} /></FormControl> <FormMessage /> </FormItem> )}/>

              {expenseToEdit && (
                <>
                  <FormField control={form.control} name="mmkServiceFee" render={({ field }) => ( <FormItem> <FormLabel>MMK Service Fee</FormLabel> <FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
                  <FormField control={form.control} name="mmkTotalAmount" render={({ field }) => ( <FormItem> <FormLabel>MMK Total Amount</FormLabel> <FormControl><Input type="number" placeholder="0" {...field} disabled value={field.value || ''} /></FormControl> <FormMessage /> </FormItem> )}/>
                </>
              )}

              <FormField control={form.control} name="remark" render={({ field }) => ( <FormItem> <FormLabel>Remark</FormLabel> <FormControl><Textarea placeholder="Add any remarks" {...field} value={field.value || ''} disabled={isSubmitting}/></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField
                control={form.control}
                name="uploadedFiles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt Image</FormLabel>
                    <FormControl>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        multiple
                        disabled={isSubmitting}
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (files) {
                            const fileInfo = await Promise.all(
                              Array.from(files).map(async (file) => {
                                const url = await fileToBase64(file);
                                return { name: file.name, url };
                              })
                            );
                            setValue('uploadedFiles', [...(getValues('uploadedFiles') || []), ...fileInfo]);
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
                            <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => handleRemoveImage(index)} disabled={isSubmitting}> <X className="h-4 w-4" /> </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </FormItem>
                )}
              />

              <div className="flex space-x-4">
                  <AlertDialog open={isReviewing} onOpenChange={setIsReviewing}>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Review Your Submission</AlertDialogTitle>
                              <AlertDialogDescription asChild>
                                <div>Please check the details carefully before submitting.</div>
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="max-h-96 overflow-y-auto pr-4 text-sm">
                              <div className="grid grid-cols-[max-content,1fr] gap-x-4 gap-y-2 items-center">
                                  <div className="font-semibold text-right">Group Name:</div>                  <div>{watch('groupName')}</div>
                                  <div className="font-semibold text-right">Date:</div>                        <div>{watch('date') ? format(new Date(watch('date')), 'EEE-dd-MMM-yyyy') : 'N/A'}</div>
                                  <div className="font-semibold text-right">Bank Type:</div>                   <div>{watch('bankType')}</div>
                                  <div className="font-semibold text-right">Township:</div>                    <div>{watch('township')}</div>
                                  <div className="font-semibold text-right">Bank Account No.:</div>            <div>{watch('bankAccountNumber')}</div>
                                  <div className="font-semibold text-right">NRC Number:</div>                  <div>{watch('nrcNumber')}</div>
                                  <div className="font-semibold text-right">Name:</div>                        <div>{watch('name')}</div>
                                  <div className="font-semibold text-right">Phone Number:</div>                <div>{watch('phoneNumber')}</div>
                                  <div className="font-semibold text-right">Collected Amount:</div>            <strong>{formatNumber(watch('collectedAmount'))}</strong>
                                  <div className="font-semibold text-right">RM Service Fee:</div>              <strong>{formatNumber(watch('rmServiceFee'))}</strong>
                                  <div className="font-semibold text-right">RM Total Amount:</div>             <strong>{formatNumber(watch('rmTotalAmount'))}</strong>
                                  <div className="font-semibold text-right">Buying Rate:</div>                 <strong>{formatNumber(watch('buyingRate'))}</strong>
                                  <div className="font-semibold text-right">Total MMK Amount:</div>            <strong>{formatNumber(watch('totalMmkTransferAmount'))}</strong>
                                  {expenseToEdit && (
                                    <>
                                      <div className="font-semibold text-right">MMK Service Fee:</div> <strong>{formatNumber(watch('mmkServiceFee'))}</strong>
                                      <div className="font-semibold text-right">Total MMK w/ Fee:</div> <strong>{formatNumber(watch('mmkTotalAmount'))}</strong>
                                    </>
                                  )}
                                  {watch('remark') && <>
                                      <div className="font-semibold text-right self-start">Remark:</div>
                                      <div className="whitespace-pre-wrap">{watch('remark')}</div>
                                  </>}
                                  {uploadedFiles && uploadedFiles.length > 0 && <>
                                      <div className="font-semibold text-right self-start">Files:</div>
                                      <div>{uploadedFiles.map(f => f.name).join(', ')}</div>
                                  </>}
                              </div>
                          </div>
                          <AlertDialogFooter>
                              <AlertDialogCancel onClick={handleCancelReview} disabled={isSubmitting}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit'}</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>

                  <Button type="button" className="flex-1 text-lg py-6" onClick={handleReviewSubmit} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : (expenseToEdit ? 'Review & Update' : 'Review Info & Submit')}</Button>
                  <Button type="button" variant="outline" className="flex-1 text-lg py-6" onClick={handleClearForm} disabled={isSubmitting}>Clear</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}

export function ExpenseForm(props: ExpenseFormProps) {
  return <ExpenseFormContent key={props.expenseToEdit?.id ?? 'new'} {...props} />;
}
