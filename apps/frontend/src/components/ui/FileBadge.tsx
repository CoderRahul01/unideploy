interface FileBadgeProps {
  extension: string;
}

const EXT_COLOURS: Record<string, string> = {
  py: "bg-[#3B82F6]/20 text-[#3B82F6]",
  ts: "bg-[#00DC82]/20 text-[#00DC82]",
  tsx: "bg-[#00DC82]/20 text-[#00DC82]",
  js: "bg-[#F59E0B]/20 text-[#F59E0B]",
  jsx: "bg-[#F59E0B]/20 text-[#F59E0B]",
  json: "bg-[#A1A1AA]/20 text-[#A1A1AA]",
  md: "bg-[#A1A1AA]/20 text-[#A1A1AA]",
  txt: "bg-[#52525B]/20 text-[#52525B]",
  env: "bg-[#EF4444]/20 text-[#EF4444]",
  dockerfile: "bg-[#3B82F6]/20 text-[#3B82F6]",
  css: "bg-pink-500/20 text-pink-400",
  html: "bg-orange-500/20 text-orange-400",
};

export default function FileBadge({ extension }: FileBadgeProps) {
  const colour = EXT_COLOURS[extension.toLowerCase()] ?? "bg-[#2A2A2A] text-[#A1A1AA]";
  return (
    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${colour}`}>
      .{extension}
    </span>
  );
}
