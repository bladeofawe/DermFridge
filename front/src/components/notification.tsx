"use client";

import { useEffect } from "react";
import { X, CheckCircle, XCircle } from "lucide-react";

interface NotificationProps {
  message: string;
  type: "success" | "error" | "warning" | "info";
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}
  
export default function Notification({ message, type, isVisible, onClose, duration = 3000 } : NotificationProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => { onClose(); }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);
  
  if (!isVisible) return null;

  const baseClasses = "fixed top-14 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out";
  
  const typeClasses = {
    success: "bg-green-100 border border-green-400 text-green-700 dark:bg-green-900 dark:border-green-800 dark:text-green-100",
    error: "bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-800 dark:text-red-100",
    warning: "bg-yellow-100 border border-yellow-400 text-yellow-700 dark:bg-yellow-900 dark:border-yellow-800 dark:text-yellow-100",
    info: "bg-blue-100 border border-blue-400 text-blue-700 dark:bg-blue-900 dark:border-blue-800 dark:text-blue-100",
  };

  const Icon = type === "success" ? CheckCircle : XCircle;

  return (
    <div className={`${baseClasses} ${typeClasses[type]} ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button onClick={onClose} className="flex-shrink-0 ml-2 hover:opacity-70 transition-opacity"><X className="w-4 h-4" /></button>
    </div>
  );
}