import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { BookOpen, Globe, Lock, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const session = await auth();
  if (session) redirect("/questions");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          <span className="font-semibold">InterviewPrep</span>
        </div>
        <div className="flex gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
            Sign in
          </Link>
          <Link href="/register" className={cn(buttonVariants())}>
            Get started
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Prepare for your next interview with confidence
        </h1>
        <p className="text-muted-foreground mt-4 max-w-lg text-lg">
          A collaborative platform with curated questions, multilingual support,
          and personalized study sets.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
            Start preparing
          </Link>
          <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
            Sign in
          </Link>
        </div>

        <div className="mt-16 grid max-w-3xl gap-8 sm:grid-cols-3">
          <div className="space-y-2">
            <div className="bg-primary/10 text-primary mx-auto flex h-10 w-10 items-center justify-center rounded-lg">
              <Globe className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Multilingual</h3>
            <p className="text-muted-foreground text-sm">
              Questions and answers in English, Vietnamese, and your custom
              language.
            </p>
          </div>
          <div className="space-y-2">
            <div className="bg-primary/10 text-primary mx-auto flex h-10 w-10 items-center justify-center rounded-lg">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Personalized</h3>
            <p className="text-muted-foreground text-sm">
              Customize default questions and add your own private collection.
            </p>
          </div>
          <div className="space-y-2">
            <div className="bg-primary/10 text-primary mx-auto flex h-10 w-10 items-center justify-center rounded-lg">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Shareable</h3>
            <p className="text-muted-foreground text-sm">
              Share your customized question set with friends via a unique link.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
