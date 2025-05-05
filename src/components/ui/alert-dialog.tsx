import React, { createContext, useContext, useState } from 'react';

// Create context to manage the dialog state
const AlertDialogContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({
  open: false,
  setOpen: () => {},
});

interface AlertDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const AlertDialog = ({
  children,
  open: controlledOpen,
  onOpenChange,
}: AlertDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  
  const setOpen = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
    
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen);
    }
  };
  
  return (
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
};

interface AlertDialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

const AlertDialogTrigger = ({
  children,
  asChild,
  ...props
}: AlertDialogTriggerProps) => {
  const { setOpen } = useContext(AlertDialogContext);
  
  if (asChild) {
    return React.cloneElement(children as React.ReactElement, {
      onClick: () => setOpen(true),
      ...props,
    });
  }
  
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      {...props}
    >
      {children}
    </button>
  );
};

interface AlertDialogContentProps {
  children: React.ReactNode;
  className?: string;
}

const AlertDialogContent = ({
  children,
  className = '',
  ...props
}: AlertDialogContentProps) => {
  const { open, setOpen } = useContext(AlertDialogContext);
  
  if (!open) {
    return null;
  }
  
  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => setOpen(false)}
      />
      <div
        className={`fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg ${className}`}
        {...props}
      >
        {children}
      </div>
    </>
  );
};

const AlertDialogHeader = ({
  children,
  className = '',
  ...props
}: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={`mb-4 text-center ${className}`} {...props}>
      {children}
    </div>
  );
};

const AlertDialogTitle = ({
  children,
  className = '',
  ...props
}: { children: React.ReactNode; className?: string }) => {
  return (
    <h2 className={`text-lg font-semibold ${className}`} {...props}>
      {children}
    </h2>
  );
};

const AlertDialogDescription = ({
  children,
  className = '',
  ...props
}: { children: React.ReactNode; className?: string }) => {
  return (
    <p className={`mt-2 text-sm text-gray-500 ${className}`} {...props}>
      {children}
    </p>
  );
};

const AlertDialogFooter = ({
  children,
  className = '',
  ...props
}: { children: React.ReactNode; className?: string }) => {
  return (
    <div
      className={`mt-6 flex justify-end space-x-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

const AlertDialogAction = ({
  children,
  className = '',
  ...props
}: { children: React.ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { setOpen } = useContext(AlertDialogContext);
  
  return (
    <button
      type="button"
      className={`rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
      onClick={() => {
        setOpen(false);
        if (props.onClick) {
          props.onClick({} as React.MouseEvent<HTMLButtonElement>);
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
};

const AlertDialogCancel = ({
  children,
  className = '',
  ...props
}: { children: React.ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { setOpen } = useContext(AlertDialogContext);
  
  return (
    <button
      type="button"
      className={`rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
      onClick={() => {
        setOpen(false);
        if (props.onClick) {
          props.onClick({} as React.MouseEvent<HTMLButtonElement>);
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
};

AlertDialog.displayName = 'AlertDialog';
AlertDialogTrigger.displayName = 'AlertDialogTrigger';
AlertDialogContent.displayName = 'AlertDialogContent';
AlertDialogHeader.displayName = 'AlertDialogHeader';
AlertDialogTitle.displayName = 'AlertDialogTitle';
AlertDialogDescription.displayName = 'AlertDialogDescription';
AlertDialogFooter.displayName = 'AlertDialogFooter';
AlertDialogAction.displayName = 'AlertDialogAction';
AlertDialogCancel.displayName = 'AlertDialogCancel';

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
};