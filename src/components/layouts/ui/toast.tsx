"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { createRoot } from 'react-dom/client';

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-100 flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto text-xs md:text-sm text-white font-semibold relative flex w-1/2 md:w-1/3 mt-4 items-center justify-center space-x-4 overflow-hidden rounded-full border-0 p-2 pr-8 shadow-2xl transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-(--radix-toast-swipe-end-x) data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-center",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface ToastPosition {
  vertical?: 'top' | 'bottom';
  horizontal?: 'left' | 'center' | 'right';
}

type ToastColor = 'success' | 'error' | 'info' | 'warning' | 'default';
interface CustomToastExtraProps {
  color?: ToastColor;
  position?: ToastPosition;
}

const colorVariants: Record<ToastColor, string> = {
  success: 'bg-green-600/80 text-white',
  error: 'bg-red-500/80 text-white',
  info: 'bg-blue-300/80 text-white',
  warning: 'bg-amber-500/80 text-white',
  default: 'bg-background text-foreground',
};

const positionVariants = (position?: ToastPosition) => {
  const vertical = position?.vertical || 'top';
  const horizontal = position?.horizontal || 'right';
  let pos = '';
  if (vertical === 'top') pos += 'top-0 ';
  else pos += 'bottom-0 ';
  if (horizontal === 'left') pos += 'left-0 ';
  else if (horizontal === 'center') pos += 'left-1/2 -translate-x-1/2 ';
  else pos += 'right-0 ';
  return pos.trim();
};

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants> & CustomToastExtraProps
>(({ className, variant, color = 'default', position, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(
        toastVariants({ variant }),
        colorVariants[color],
        className
      )}
      style={position ? { position: 'fixed', zIndex: 100, ...((position.vertical === 'top') ? { top: 0 } : { bottom: 0 }), ...((position.horizontal === 'left') ? { left: 0 } : (position.horizontal === 'center') ? { left: '50%', transform: 'translateX(-50%)' } : { right: 0 }) } : undefined}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-hidden focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 hover:group-[.destructive]:text-red-50 focus:group-[.destructive]:ring-red-400 focus:group-[.destructive]:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

// Promise-based toast with confirm/cancel actions (Swal-like)
export function showConfirmToast({
  title,
  description,
  color = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  position,
}: {
  title: string;
  description?: string;
  color?: ToastColor;
  confirmText?: string;
  cancelText?: string;
  position?: ToastPosition;
}): Promise<boolean> {
  // Create a div to mount the toast
  const toastDiv = document.createElement('div');
  document.body.appendChild(toastDiv);
  const root = createRoot(toastDiv);

  return new Promise((resolve) => {
    function handleClose(result: boolean) {
      root.unmount();
      document.body.removeChild(toastDiv);
      resolve(result);
    }
    root.render(
      <ToastProvider>
        <Toast
          open={true}
          color={color}
          position={position}
          onOpenChange={(open) => {
            if (!open) handleClose(false);
          }}
        >
          <ToastTitle>{title}</ToastTitle>
          {description && <ToastDescription>{description}</ToastDescription>}
          <div className="flex gap-2 mt-2">
            <button
              className="btn btn-sm bg-blue-600 text-white rounded-sm px-3 py-1"
              onClick={() => handleClose(true)}
            >
              {confirmText}
            </button>
            <button
              className="btn btn-sm bg-gray-300 text-gray-800 rounded-sm px-3 py-1"
              onClick={() => handleClose(false)}
            >
              {cancelText}
            </button>
          </div>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
  });
}

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
