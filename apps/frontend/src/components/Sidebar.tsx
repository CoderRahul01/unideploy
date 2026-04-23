"use client";

import { Globe, LogOut } from "lucide-react";
import { logout } from "@/lib/firebase";
import { User } from "firebase/auth";

interface SidebarProps {
  user: User;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNewProject?: () => void;
}

const NAV_ITEMS = [
  { id: "deployments", label: "Deployments", icon: Globe },
];

export default function Sidebar({ user, activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-full w-[220px] border-r border-[#2A2A2A] bg-[#111111] p-5 z-50 flex flex-col">
      <div className="flex items-center gap-3 mb-8 px-1">
        <div className="w-8 h-8 flex items-center justify-center">
          <img src="/logo.png" alt="UniDeploy Logo" className="w-full h-full object-contain" />
        </div>
        <span className="text-sm font-bold tracking-tight text-[#F5F5F5]">UniDeploy</span>
      </div>

      <nav className="space-y-0.5 flex-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? "bg-[#1A1A1A] text-[#F5F5F5]"
                : "text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1A1A1A]"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A]">
          <p className="text-[10px] text-[#52525B] uppercase font-black tracking-widest mb-1">
            Free Tier
          </p>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Max <span className="text-[#00DC82]">1-hour sessions</span>. Up to 20 concurrent sandboxes.
          </p>
        </div>

        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A]">
          <div className="w-7 h-7 rounded-full bg-[#00DC82]/20 text-[#00DC82] flex items-center justify-center font-bold text-xs flex-shrink-0">
            {user.displayName?.[0] || user.email?.[0] || "?"}
          </div>
          <div className="flex-1 overflow-hidden min-w-0">
            <p className="text-xs font-medium truncate text-[#F5F5F5]">
              {user.displayName || "Developer"}
            </p>
            <p className="text-[10px] text-[#52525B] truncate">{user.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 hover:bg-[#2A2A2A] rounded-lg text-[#52525B] hover:text-[#EF4444] transition-colors flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
