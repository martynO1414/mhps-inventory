import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'AVAILABLE' | 'RELEASED';
  destination?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, destination, size = 'md' }: StatusBadgeProps) {
  const isAvailable = status === 'AVAILABLE';
  const label = destination ? `${status} — ${destination}` : status;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide uppercase',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        isAvailable
          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
          : 'bg-amber-100 text-amber-700 border border-amber-200'
      )}
    >
      <span
        className={cn(
          'inline-block rounded-full',
          size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
          isAvailable ? 'bg-emerald-500' : 'bg-amber-500'
        )}
      />
      {label}
    </span>
  );
}

export function TransactionBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    CREATED: 'bg-blue-100 text-blue-700 border-blue-200',
    CHECKED_OUT: 'bg-amber-100 text-amber-700 border-amber-200',
    RETURNED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    RELEASED_TO_ANOTHER_TEAM: 'bg-purple-100 text-purple-700 border-purple-200',
    UPDATED: 'bg-slate-100 text-slate-700 border-slate-200',
    QUANTITY_UPDATED: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  };
  const labels: Record<string, string> = {
    CREATED: 'Created',
    CHECKED_OUT: 'Checked Out',
    RETURNED: 'Returned',
    RELEASED_TO_ANOTHER_TEAM: 'Transferred',
    UPDATED: 'Updated',
    QUANTITY_UPDATED: 'Qty Updated',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border',
        colors[type] ?? 'bg-slate-100 text-slate-700 border-slate-200'
      )}
    >
      {labels[type] ?? type}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm', className)}>
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-slate-600 hover:bg-slate-100',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    warning: 'bg-amber-500 text-white hover:bg-amber-600',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-lg',
    lg: 'px-6 py-3.5 text-base rounded-xl',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  className,
  hint,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  hint?: string;
}) {
  return (
    <label className={cn('block', className)}>
      {label && (
        <span className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder-slate-400
          focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-shadow"
      />
      {hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
  required,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      {label && (
        <span className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 bg-white
          focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-shadow"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="block text-sm font-medium text-slate-700 mb-1.5">{label}</span>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder-slate-400
          focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-shadow resize-none"
      />
    </label>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      {icon && <div className="mb-4 text-slate-300">{icon}</div>}
      <h3 className="text-lg font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{message}</p>
      {action}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-slate-300 border-t-slate-700',
        className ?? 'w-5 h-5'
      )}
    />
  );
}
