import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

type AlertVariant = 'error' | 'success' | 'info' | 'warning';

const styles: Record<AlertVariant, { container: string; icon: string; Icon: typeof Info }> = {
  error: { container: 'bg-red-50 border-red-200 text-red-800', icon: 'text-red-500', Icon: XCircle },
  success: { container: 'bg-green-50 border-green-200 text-green-800', icon: 'text-green-500', Icon: CheckCircle2 },
  info: { container: 'bg-blue-50 border-blue-200 text-blue-800', icon: 'text-blue-500', Icon: Info },
  warning: { container: 'bg-amber-50 border-amber-200 text-amber-800', icon: 'text-amber-500', Icon: AlertCircle },
};

interface AlertProps {
  variant?: AlertVariant;
  message: string;
  className?: string;
}

export default function Alert({ variant = 'error', message, className }: AlertProps) {
  const { container, icon, Icon } = styles[variant];
  return (
    <div className={cn('flex items-start gap-3 rounded-md border p-3', container, className)}>
      <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', icon)} />
      <p className="text-sm">{message}</p>
    </div>
  );
}
