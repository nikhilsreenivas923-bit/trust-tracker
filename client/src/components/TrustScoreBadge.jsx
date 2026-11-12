import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';

/**
 * Displays a color-coded Trust Score badge:
 * - Green: > 80
 * - Yellow: 50 to 80
 * - Red: < 50
 */
export default function TrustScoreBadge({ score, size = 'md', showLabel = true }) {
  const numericScore = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));

  let tier = {
    label: 'High Risk',
    containerClass: 'bg-red-50 text-red-700 border-red-200',
    dotClass: 'bg-red-500',
    Icon: ShieldAlert,
  };

  if (numericScore > 80) {
    tier = {
      label: 'High Trust',
      containerClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500',
      Icon: ShieldCheck,
    };
  } else if (numericScore >= 50) {
    tier = {
      label: 'Moderate Risk',
      containerClass: 'bg-amber-50 text-amber-800 border-amber-200',
      dotClass: 'bg-amber-500',
      Icon: AlertTriangle,
    };
  }

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-sm gap-2',
    lg: 'px-4 py-2 text-base gap-2.5',
  };

  const { Icon } = tier;

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${tier.containerClass} ${
        sizeClasses[size] || sizeClasses.md
      }`}
    >
      <Icon className={size === 'lg' ? 'w-5 h-5' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      <span className="tabular-nums">{numericScore}/100</span>
      {showLabel && (
        <span className="font-medium opacity-85">· {tier.label}</span>
      )}
    </span>
  );
}

