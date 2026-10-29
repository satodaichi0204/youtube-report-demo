import type { Metadata } from "next";
import ClientOnly from "@/components/ClientOnly";
import SearchPage from "@/components/SearchPage";
import Shell from "@/components/Shell";

export const metadata: Metadata = { title: "検索キーワード" };

export default function Page() {
  return (
    <Shell>
      <ClientOnly>
        <SearchPage />
      </ClientOnly>
    </Shell>
  );
}
