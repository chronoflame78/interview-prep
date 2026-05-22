import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-muted-foreground mt-2 text-lg">Page not found</p>
      <Link
        href="/questions"
        className={cn(buttonVariants({ variant: "outline" }), "mt-6")}
      >
        Go to Questions
      </Link>
    </div>
  );
}
