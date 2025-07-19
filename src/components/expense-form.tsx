'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { populateFormFromImage } from '@/ai/flows/populate-form-from-image';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CalendarIcon, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { expenseSchema, type Expense, type ExpenseWithId } from '@/lib/types';

interface ExpenseFormProps {
  addRecord: (record: ExpenseWithId) => void;
}

export function ExpenseForm({ addRecord }: ExpenseFormProps) {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = React.useState(false);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<Expense>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      vendor: '',
      amount: '' as unknown as number, // Use empty string for initial state
      category: 'Food',
      isBusinessExpense: true,
      notes: '',
      otherCategory: '',
    },
  });

  const watchedCategory = form.watch('category');

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScanImage = async () => {
    if (!imagePreview) {
      toast({
        title: 'No Image Selected',
        description: 'Please select an image file to scan.',
        variant: 'destructive',
      });
      return;
    }
    setIsScanning(true);
    try {
      // A simplified representation of the schema for the AI
      const formSchemaForAI = {
        vendor: "string",
        transactionDate: "date (YYYY-MM-DD)",
        amount: "number",
        category: "enum ('Food', 'Travel', 'Office Supplies', 'Other')",
      };

      const result = await populateFormFromImage({
        photoDataUri: imagePreview,
        formSchema: JSON.stringify(formSchemaForAI),
      });

      if (result.vendor) form.setValue('vendor', String(result.vendor), { shouldValidate: true });
      if (result.amount) form.setValue('amount', Number(result.amount), { shouldValidate: true });
      if (result.transactionDate) {
        const parsedDate = new Date(result.transactionDate);
        if (!isNaN(parsedDate.getTime())) {
            form.setValue('transactionDate', parsedDate, { shouldValidate: true });
        }
      }
      if (result.category && ['Food', 'Travel', 'Office Supplies', 'Other'].includes(String(result.category))) {
        form.setValue('category', result.category as 'Food' | 'Travel' | 'Office Supplies' | 'Other', { shouldValidate: true });
      }
      toast({
        title: 'Scan Successful',
        description: 'Form has been populated with data from the image.',
      });
    } catch (error) {
      console.error('AI Scan Error:', error);
      toast({
        title: 'Scan Failed',
        description: 'Could not extract data. Please fill the form manually.',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };
  
  const onSubmit = (data: Expense) => {
    const newRecord = { ...data, id: new Date().toISOString() };
    addRecord(newRecord);
    form.reset();
    setImagePreview(null);
    if(fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast({
      title: 'Record Saved!',
      description: 'Your expense has been added and the dashboard is updated.',
    });
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle>Add Expense Record</CardTitle>
        <CardDescription>Fill out the form below or scan a receipt.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 border-2 border-dashed rounded-lg text-center bg-muted/20">
            {imagePreview ? (
                <div className="relative w-full h-48 mb-4">
                    <img src={imagePreview} alt="Receipt preview" className="rounded-md object-contain w-full h-full" />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-48">
                    <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Upload a receipt for AI scanning</p>
                </div>
            )}
            <div className="flex gap-2 justify-center">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    {imagePreview ? 'Change Image' : 'Upload Image'}
                </Button>
                <Input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                    aria-label="Upload receipt image"
                />
                {imagePreview && (
                    <Button type="button" onClick={handleScanImage} disabled={isScanning} className="bg-primary hover:bg-primary/90">
                        {isScanning ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Scan with AI
                    </Button>
                )}
            </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="vendor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Starbucks" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value === undefined ? '' : field.value} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="transactionDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col pt-2">
                    <FormLabel>Transaction Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
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
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date('2000-01-01')
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Food">Food</SelectItem>
                      <SelectItem value="Travel">Travel</SelectItem>
                      <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {watchedCategory === 'Other' && (
              <div className="animate-in fade-in-50 duration-500">
                <FormField
                  control={form.control}
                  name="otherCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specify Other Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Software Subscription" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <Button type="submit" className="w-full text-lg py-6" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Record
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
