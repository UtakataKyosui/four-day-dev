"use client";

import { NavSidebar } from "@/components/shared/NavSidebar";
import { isLoggedIn } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    const timer = setTimeout(() => setChecked(true), 0);
    return () => clearTimeout(timer);
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <NavSidebar />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
