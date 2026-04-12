import { cn } from '@/lib/utils';

interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
}

function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  onValueChange,
  className,
  id,
  disabled,
}: SliderProps) {
  const currentValue = value?.[0] ?? defaultValue?.[0] ?? min;
  const pct = ((currentValue - min) / (max - min)) * 100;

  return (
    <div className={cn('relative flex items-center w-full h-5', className)}>
      <div className="relative w-full h-1 rounded-full bg-slate-700">
        <div
          className="absolute h-1 rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        disabled={disabled}
        onChange={e => onValueChange?.([Number(e.target.value)])}
        className="absolute inset-0 w-full opacity-0 cursor-pointer h-full disabled:cursor-not-allowed"
      />
    </div>
  );
}

export { Slider };
