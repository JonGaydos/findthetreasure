'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Props {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}

export default function CircleToggle({ checked, onCheckedChange }: Props) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-700 rounded-lg">
      <div>
        <Label htmlFor="circle-toggle" className="text-slate-300 text-sm cursor-pointer">
          Circle overlays
        </Label>
        <p className="text-slate-500 text-xs mt-0.5">Hide for hard mode</p>
      </div>
      <Switch
        id="circle-toggle"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
