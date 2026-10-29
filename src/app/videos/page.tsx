import type { Metadata } from "next";
import ClientOnly from "@/components/ClientOnly";
import Videos from "@/components/Videos";
import Shell from "@/components/Shell";

export const metadata: Metadata = { title: "動画の比較と推移" };

export default function Page() {
  return (
    <Shell>
      <ClientOnly>
        <Videos />
      </ClientOnly>
    </Shell>
  );
}
