import type { Metadata } from "next";
import ClientOnly from "@/components/ClientOnly";
import Audience from "@/components/Audience";
import Shell from "@/components/Shell";

export const metadata: Metadata = { title: "視聴者" };

export default function Page() {
  return (
    <Shell>
      <ClientOnly>
        <Audience />
      </ClientOnly>
    </Shell>
  );
}
