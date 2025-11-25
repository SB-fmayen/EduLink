import { GraduationCap } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2 font-semibold text-xl tracking-tight">
      <div className="bg-primary text-primary-foreground p-2 rounded-lg">
        <GraduationCap className="h-6 w-6" />
      </div>
      <span>EduLink</span>
    </div>
  );
}
