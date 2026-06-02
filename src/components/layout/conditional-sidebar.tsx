"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

function showSidebarFor(pathname: string): boolean {
  return pathname === "/questions" || pathname.startsWith("/questions/");
}

export function ConditionalSidebar() {
  const pathname = usePathname();
  if (!showSidebarFor(pathname)) return null;

  return (
    <aside className="bg-card hidden w-64 shrink-0 border-r md:block">
      <div className="sticky top-14 h-[calc(100vh-3.5rem)]">
        <Sidebar />
      </div>
    </aside>
  );
}

export function ConditionalSidebarMobileTrigger({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (!showSidebarFor(pathname)) return null;
  return <>{children}</>;
}
