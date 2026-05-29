import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple';

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
};

function getStatusVariant(status: string): BadgeVariant {
  const s = status.toLowerCase();
  if (s === 'open') return 'info';
  if (s === 'work in progress') return 'warning';
  if (s === 'closed' || s === 'resolved') return 'success';
  if (s === 'rejected') return 'error';
  if (s === 'on hold') return 'purple';
  return 'default';
}

function getPriorityVariant(priority: string): BadgeVariant {
  const p = priority.toLowerCase();
  if (p === 'critical') return 'error';
  if (p === 'high') return 'warning';
  if (p === 'medium') return 'info';
  return 'default';
}

interface BadgeProps {
  children: string;
  variant?: BadgeVariant;
  type?: 'status' | 'priority';
  className?: string;
}

export default function Badge({ children, variant, type, className }: BadgeProps) {
  const resolvedVariant =
    variant ??
    (type === 'status'
      ? getStatusVariant(children)
      : type === 'priority'
      ? getPriorityVariant(children)
      : 'default');

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[resolvedVariant],
        className
      )}
    >
      {children}
    </span>
  );
}
