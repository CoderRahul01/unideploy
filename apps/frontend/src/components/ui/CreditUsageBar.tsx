interface CreditUsageBarProps {
  used: number;
  total: number;
}

export default function CreditUsageBar({ used, total }: CreditUsageBarProps) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const colour =
    pct > 95 ? "bg-[#EF4444]" : pct > 80 ? "bg-[#F59E0B]" : "bg-[#00DC82]";
  const textColour =
    pct > 95 ? "text-[#EF4444]" : pct > 80 ? "text-[#F59E0B]" : "text-[#A1A1AA]";

  return (
    <div className="space-y-1">
      <div className="w-full h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colour}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-[9px] uppercase font-bold tracking-tighter ${textColour}`}>
        {used} / {total} mins
      </p>
    </div>
  );
}
