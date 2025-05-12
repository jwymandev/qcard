'use client';

import React, { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Switch,
  Separator,
  Badge,
  Checkbox,
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui';

// Define field types
export enum SurveyFieldType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  NUMBER = 'NUMBER',
  DROPDOWN = 'DROPDOWN',
  CHECKBOX = 'CHECKBOX',
  RADIO = 'RADIO',
}

// Field option schema
const optionSchema = z.object({
  id: z.string(),
  label: z.string().min(1, 'Label is required'),
  value: z.string().min(1, 'Value is required'),
});

// Field schema
const fieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1, 'Label is required'),
  type: z.nativeEnum(SurveyFieldType),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  description: z.string().optional(),
  options: z.array(optionSchema).optional(),
});

// Survey schema
const surveySchema = z.object({
  fields: z.array(fieldSchema).min(1, 'At least one field is required'),
});

type SurveyFormValues = z.infer<typeof surveySchema>;

interface SurveyFieldBuilderProps {
  initialFields?: any;
  onSave: (fields: any) => void;
  onCancel: () => void;
}

export default function SurveyFieldBuilder({
  initialFields,
  onSave,
  onCancel,
}: SurveyFieldBuilderProps) {
  const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(null);

  // Parse initialFields if provided
  const parsedInitialFields = initialFields
    ? initialFields.fields || []
    : [];

  // Set up form with initial values
  const form = useForm<SurveyFormValues>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      fields: parsedInitialFields.length > 0
        ? parsedInitialFields
        : [{ id: generateId(), label: '', type: SurveyFieldType.TEXT, required: false }],
    },
  });

  // Set up field array
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'fields',
  });

  // Helper to generate unique IDs
  function generateId() {
    return Math.random().toString(36).substring(2, 11);
  }

  // Add a new field
  const addField = (type: SurveyFieldType) => {
    const newField = {
      id: generateId(),
      label: '',
      type,
      required: false,
      ...(type === SurveyFieldType.DROPDOWN || type === SurveyFieldType.RADIO
        ? { options: [{ id: generateId(), label: 'Option 1', value: 'option_1' }] }
        : {}),
    };
    append(newField);
    setActiveFieldIndex(fields.length);
  };

  // Handle form submission
  const onSubmit = (data: SurveyFormValues) => {
    onSave(data);
  };

  // Handle adding field options for dropdown or radio fields
  const addOption = (fieldIndex: number) => {
    const currentOptions = form.getValues(`fields.${fieldIndex}.options`) || [];
    const newOptions = [
      ...currentOptions,
      {
        id: generateId(),
        label: `Option ${currentOptions.length + 1}`,
        value: `option_${currentOptions.length + 1}`,
      },
    ];
    form.setValue(`fields.${fieldIndex}.options`, newOptions);
  };

  // Handle removing field options
  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const currentOptions = form.getValues(`fields.${fieldIndex}.options`) || [];
    const newOptions = currentOptions.filter((_, i) => i !== optionIndex);
    form.setValue(`fields.${fieldIndex}.options`, newOptions);
  };

  // Move a field up or down
  const moveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < fields.length) {
      move(index, newIndex);
      setActiveFieldIndex(newIndex);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Survey Builder</h3>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              Add Field
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2">
            <div className="grid gap-1">
              <Button
                variant="ghost"
                className="justify-start px-2 py-1 h-auto font-normal"
                onClick={() => addField(SurveyFieldType.TEXT)}
              >
                Short Text
              </Button>
              <Button
                variant="ghost"
                className="justify-start px-2 py-1 h-auto font-normal"
                onClick={() => addField(SurveyFieldType.TEXTAREA)}
              >
                Long Text
              </Button>
              <Button
                variant="ghost"
                className="justify-start px-2 py-1 h-auto font-normal"
                onClick={() => addField(SurveyFieldType.NUMBER)}
              >
                Number
              </Button>
              <Button
                variant="ghost"
                className="justify-start px-2 py-1 h-auto font-normal"
                onClick={() => addField(SurveyFieldType.DROPDOWN)}
              >
                Dropdown
              </Button>
              <Button
                variant="ghost"
                className="justify-start px-2 py-1 h-auto font-normal"
                onClick={() => addField(SurveyFieldType.CHECKBOX)}
              >
                Checkbox
              </Button>
              <Button
                variant="ghost"
                className="justify-start px-2 py-1 h-auto font-normal"
                onClick={() => addField(SurveyFieldType.RADIO)}
              >
                Radio Buttons
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {fields.length === 0 ? (
            <div className="p-4 border border-dashed rounded-md text-center text-gray-500">
              No fields added yet. Click &quot;Add Field&quot; to start building your survey.
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className={`border rounded-md ${
                    activeFieldIndex === index ? 'border-blue-500' : 'border-gray-200'
                  }`}
                >
                  <div
                    className="p-3 cursor-pointer flex justify-between items-center"
                    onClick={() => setActiveFieldIndex(activeFieldIndex === index ? null : index)}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {form.watch(`fields.${index}.label`) || `Field ${index + 1}`}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {field.type}
                      </Badge>
                      {form.watch(`fields.${index}.required`) && (
                        <Badge className="text-xs bg-red-100 text-red-800 border-red-200">Required</Badge>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveField(index, 'up');
                        }}
                        disabled={index === 0}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-up"><path d="m18 15-6-6-6 6"/></svg>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveField(index, 'down');
                        }}
                        disabled={index === fields.length - 1}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(index);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                      </Button>
                    </div>
                  </div>

                  {activeFieldIndex === index && (
                    <div className="p-4 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`fields.${index}.label`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Label</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter field label" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`fields.${index}.required`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-x-2 space-y-0">
                              <FormLabel>Required Field</FormLabel>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name={`fields.${index}.description`}
                        render={({ field }) => (
                          <FormItem className="mt-4">
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Help text for this field"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {(form.watch(`fields.${index}.type`) === SurveyFieldType.TEXT ||
                        form.watch(`fields.${index}.type`) === SurveyFieldType.TEXTAREA ||
                        form.watch(`fields.${index}.type`) === SurveyFieldType.NUMBER) && (
                        <FormField
                          control={form.control}
                          name={`fields.${index}.placeholder`}
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>Placeholder</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Placeholder text"
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Options for dropdown or radio fields */}
                      {(form.watch(`fields.${index}.type`) === SurveyFieldType.DROPDOWN ||
                        form.watch(`fields.${index}.type`) === SurveyFieldType.RADIO) && (
                        <div className="mt-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <FormLabel>Options</FormLabel>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addOption(index)}
                            >
                              Add Option
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            {(form.watch(`fields.${index}.options`) || []).map((option, optionIndex) => (
                              <div key={option.id} className="flex items-center space-x-2">
                                <Input
                                  placeholder="Option label"
                                  value={option.label}
                                  onChange={(e) => {
                                    const newOptions = [...form.getValues(`fields.${index}.options`) || []];
                                    newOptions[optionIndex].label = e.target.value;
                                    newOptions[optionIndex].value = e.target.value
                                      .toLowerCase()
                                      .replace(/\s+/g, '_');
                                    form.setValue(`fields.${index}.options`, newOptions);
                                  }}
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeOption(index, optionIndex)}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Save Survey</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}