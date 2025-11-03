
"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useEffect, useState } from "react";
import { getSettings } from "@/services/settingsService";

export function Toaster() {
  const { toasts } = useToast();
  const [toastDuration, setToastDuration] = useState(5000);

  useEffect(() => {
    getSettings().then(settings => {
      setToastDuration(settings.toastDuration || 5000);
    });
  }, [toasts]); // Re-check settings if a new toast appears, in case settings were just changed


  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} duration={toastDuration}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
