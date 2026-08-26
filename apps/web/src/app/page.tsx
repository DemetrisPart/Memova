import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-semibold text-charcoal-900">Momeva</h1>
      <p className="mt-3 max-w-md text-stone-400">
        Memories from everyone who celebrated with you.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/auth/login">
          <Button>Couple sign in</Button>
        </Link>
        <Link href="/auth/login?mode=register">
          <Button variant="secondary">Create account</Button>
        </Link>
      </div>
    </main>
  );
}
