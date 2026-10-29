import type { Metadata } from "next";
import ClientOnly from "@/components/ClientOnly";
import Overview from "@/components/Overview";
import Shell from "@/components/Shell";

export const metadata: Metadata = { title: { absolute: "YouTube 分析レポート（デモ）" } };

export default function Page() {
  return (
    <Shell>
      <ClientOnly>
        <Overview />
      </ClientOnly>
    </Shell>
  );
}
