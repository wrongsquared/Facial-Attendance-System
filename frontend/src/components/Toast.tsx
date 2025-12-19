import { useEffect } from "react";
import { CheckCircle } from "lucide-react";

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 min-w-[300px]">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <p className="text-gray-900">{message}</p>
      </div>
    </div>
  );
}