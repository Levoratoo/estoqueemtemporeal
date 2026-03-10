import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function ErrorBanner({ message, className }: { message: string; className?: string }) {
  return (
    <div
      className={cn(
        "glass-card flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100",
        className
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-300" />
      <div>
        <p className="font-medium">Falha ao atualizar dados</p>
        <p className="text-xs text-rose-200/80">{message}</p>
      </div>
    </div>
  );
}
