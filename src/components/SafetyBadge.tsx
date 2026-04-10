import { cn } from '@/lib/utils';

interface SafetyBadgeProps {
  safety: 'safe' | 'caution' | 'danger';
  className?: string;
}

const labels = { safe: '안전', caution: '주의', danger: '위험' };

const SafetyBadge = ({ safety, className }: SafetyBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
        safety === 'safe' && 'bg-success/15 text-success',
        safety === 'caution' && 'bg-warning/15 text-warning',
        safety === 'danger' && 'bg-danger/15 text-danger',
        className
      )}
    >
      <span
        className={cn(
          'mr-1 h-1.5 w-1.5 rounded-full',
          safety === 'safe' && 'bg-success',
          safety === 'caution' && 'bg-warning',
          safety === 'danger' && 'bg-danger'
        )}
      />
      {labels[safety]}
    </span>
  );
};

export default SafetyBadge;
