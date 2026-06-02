import { Header } from "@/components/layout/header";
import { ConditionalSidebar } from "@/components/layout/conditional-sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex">
        <ConditionalSidebar />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
