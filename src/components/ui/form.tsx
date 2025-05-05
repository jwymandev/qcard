import React from 'react';
import { useFormContext, Controller, FieldPath, FieldValues } from 'react-hook-form';

interface FormProps<TFieldValues extends FieldValues = FieldValues> {
  className?: string;
  children: React.ReactNode;
}

const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <form ref={ref} className={className} {...props}>
        {children}
      </form>
    );
  }
);

interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName;
  control?: any;
  render: ({
    field,
    fieldState,
  }: {
    field: any;
    fieldState?: any;
  }) => React.ReactElement;
}

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  control,
  render,
}: FormFieldProps<TFieldValues, TName>) => {
  const formContext = useFormContext();
  const formControl = control || formContext?.control;

  if (!formControl) {
    throw new Error(
      'FormField must be used within a Form or be passed a control prop'
    );
  }

  return (
    <Controller
      name={name}
      control={formControl}
      render={({ field, fieldState }) => render({ field, fieldState })}
    />
  );
};

interface FormItemProps {
  className?: string;
  children: React.ReactNode;
}

const FormItem = React.forwardRef<HTMLDivElement, FormItemProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`space-y-2 ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

interface FormLabelProps {
  className?: string;
  children: React.ReactNode;
}

const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={`text-sm font-medium text-gray-900 ${className}`}
        {...props}
      >
        {children}
      </label>
    );
  }
);

interface FormControlProps {
  className?: string;
  children: React.ReactNode;
}

const FormControl = React.forwardRef<HTMLDivElement, FormControlProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`mt-1 ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

interface FormDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

const FormDescription = React.forwardRef<HTMLParagraphElement, FormDescriptionProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`text-xs text-gray-500 ${className}`}
        {...props}
      >
        {children}
      </p>
    );
  }
);

interface FormMessageProps {
  className?: string;
  children?: React.ReactNode;
}

const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(
  ({ className = '', children, ...props }, ref) => {
    const formContext = useFormContext();
    const { formState } = formContext || {};
    const { errors } = formState || {};

    // If no children provided and errors exist, render the error
    if (!children && errors) {
      // This is a simplified approach - in a real application, you would determine the field
      // from the context and grab the appropriate error message
      return (
        <p
          ref={ref}
          className={`text-xs font-medium text-red-500 ${className}`}
          {...props}
        >
          {typeof children === 'string' ? children : 'Invalid field'}
        </p>
      );
    }

    if (!children) {
      return null;
    }

    return (
      <p
        ref={ref}
        className={`text-xs font-medium text-red-500 ${className}`}
        {...props}
      >
        {children}
      </p>
    );
  }
);

Form.displayName = 'Form';
FormField.displayName = 'FormField';
FormItem.displayName = 'FormItem';
FormLabel.displayName = 'FormLabel';
FormControl.displayName = 'FormControl';
FormDescription.displayName = 'FormDescription';
FormMessage.displayName = 'FormMessage';

export {
  Form as default,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
};