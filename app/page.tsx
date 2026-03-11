"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050611] text-white">
      <Link
        href="/dashboard"
        className="rounded-full border border-white/15 px-6 py-2 text-sm text-white/90 hover:border-white/30 hover:text-white"
      >
        Abrir dashboard
      </Link>
    </main>
  );
}
