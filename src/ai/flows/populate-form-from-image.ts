// src/ai/flows/populate-form-from-image.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow that populates form fields based on data extracted from an image.
 *
 * - populateFormFromImage - A function that accepts an image and a form schema, extracts data from the image using AI, and returns a JSON object suitable for populating the form.
 * - PopulateFormFromImageInput - The input type for the populateFormFromImage function.
 * - PopulateFormFromImageOutput - The return type for the populateFormFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema
const PopulateFormFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo containing data to populate the form, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  formSchema: z
    .string()
    .describe("A JSON schema describing the form's fields."),
});

export type PopulateFormFromImageInput = z.infer<typeof PopulateFormFromImageInputSchema>;

// Define the output schema
const PopulateFormFromImageOutputSchema = z.record(z.any()).describe('A JSON object containing the extracted data, suitable for populating the form fields.');

export type PopulateFormFromImageOutput = z.infer<typeof PopulateFormFromImageOutputSchema>;

// Exported function to call the flow
export async function populateFormFromImage(
  input: PopulateFormFromImageInput
): Promise<PopulateFormFromImageOutput> {
  return populateFormFromImageFlow(input);
}

const populateFormFromImagePrompt = ai.definePrompt({
  name: 'populateFormFromImagePrompt',
  input: {schema: PopulateFormFromImageInputSchema},
  output: {schema: PopulateFormFromImageOutputSchema},
  prompt: `You are an AI assistant that extracts data from images to populate form fields.

  The user will provide an image as a data URI and a JSON schema describing the form's fields.
  Your task is to analyze the image and extract the relevant data to populate the form fields.
  Return a JSON object where the keys are the form field names and the values are the extracted data.

  Here's the form schema:
  {{formSchema}}

  Here's the image:
  {{media url=photoDataUri}}

  Ensure that the output is a valid JSON object that conforms to the provided schema.
  If a field cannot be determined from the image, return null for that field.
  `,
});

// Define the Genkit flow
const populateFormFromImageFlow = ai.defineFlow(
  {
    name: 'populateFormFromImageFlow',
    inputSchema: PopulateFormFromImageInputSchema,
    outputSchema: PopulateFormFromImageOutputSchema,
  },
  async (input) => {
    const {output} = await populateFormFromImagePrompt(input);
    return output!;
  }
);
