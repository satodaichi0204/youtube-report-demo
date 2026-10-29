import { ExternalLink, KeyRound, MousePointerClick, Sunrise } from "lucide-react";
import type { Metadata } from "next";
import { AvailList } from "@/components/Avail";
import Shell from "@/components/Shell";
import { ARCH_SVG } from "@/lib/diagrams";
import { GITHUB_URL, TEST_RESULTS } from "@/lib/results";

export const metadata: Metadata = { title: "このデモについて" };

const H2 = ({ no, children }: { no: number; children: React.ReactNode }) => (
  <h2 className="mb-3 flex items-center gap-2.5 text-[18px] font-black md:text-[20px]">
    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-[13px] text-white">{no}</span>
    {children}
  </h2>
);

const COST = [
  { name: "Looker Studio", note: "レポートの作成と閲覧" },
  { name: "Google スプレッドシート", note: "日次の数値の蓄積" },
  { name: "Google Apps Script（GAS）", note: "毎朝の自動の取得" },
  { name: "YouTube Analytics API、Data API", note: "上限の範囲に収まる作り" },
];

export default function About() {
  return (
    <Shell>
      <article className="mx-auto max-w-4xl space-y-6 text-[14.5px] leading-[1.85]">
        <section className="card p-5 md:p-6">
          <H2 no={1}>このデモの目的</H2>
          <p>
            YouTube の動画ごとの数値の推移、検索キーワード、視聴者を、<b>毎朝、昨日までの数字がそろうレポート</b>にする仕組みのデモです。料理のチャンネル「ゆるっと台所チャンネル（架空）」の30本の動画で作りました。
          </p>
          <p className="mt-2">
            一番の工夫は、すべてのグラフとカードの右上に<b>「取れる」「条件つき」「取れない」</b>の印を付けたことです。印を押すと、理由と代わりの案が出ます。何が取れて、何が取れないかを、レポートの画面そのものの上で確かめられます。
          </p>
          <p className="mt-3 rounded-lg bg-paper px-3.5 py-2.5 text-[13px] text-sub">
            <b className="text-ink">数値はすべて架空です。</b>本物の YouTube には接続していません。納品は Looker Studio で、この画面と同じ構成で作ります。
          </p>
        </section>

        <section className="card p-5 md:p-6" data-testid="about-avail">
          <H2 no={2}>取れるもの、条件つきのもの、取れないもの</H2>
          <p className="mb-4 text-[13px] text-sub">公開されている仕様にもとづく整理です。ご契約の後に、依頼者のチャンネルで実際に確かめます。</p>
          <AvailList />
        </section>

        <section className="card p-5 md:p-6">
          <H2 no={3}>構成</H2>
          <div className="overflow-x-auto">
            <div className="min-w-[560px]" dangerouslySetInnerHTML={{ __html: ARCH_SVG }} />
          </div>
          <p className="mt-3">
            GAS が毎朝、YouTube Analytics API と Data API から前日までの数値を取り、スプレッドシートに日次で蓄積します。Looker Studio はスプレッドシートを読んでレポートを出します。API の数値は2〜3日遅れて確定するため、毎朝、<b>直近5日分を取り直して上書き</b>します。
          </p>
        </section>

        <section className="card p-5 md:p-6">
          <H2 no={4}>2段階の納品</H2>
          <ol className="grid gap-3 md:grid-cols-2">
            <li className="rounded-xl border border-line p-4">
              <div className="eyebrow">第1段階</div>
              <b className="text-[15.5px]">主要な指標を先にお届けします</b>
              <p className="mt-1 text-[13.5px] text-sub">Looker Studio の標準のコネクタで、再生回数、総再生時間、平均視聴時間などを、コードなしで出します。動画の比較と推移もここで見られます。</p>
            </li>
            <li className="rounded-xl border border-accent/40 bg-accent-soft/50 p-4">
              <div className="eyebrow">第2段階</div>
              <b className="text-[15.5px]">検索キーワードと日次の蓄積を足します</b>
              <p className="mt-1 text-[13.5px] text-sub">標準のコネクタでは扱えない検索キーワード（チャンネル全体と動画ごと）を、GAS と API で取り、スプレッドシートに日次で蓄積して足します。</p>
            </li>
          </ol>
        </section>

        <section className="card p-5 md:p-6">
          <H2 no={5}>許可の進め方（パスワードは預かりません）</H2>
          <ol className="grid gap-3 md:grid-cols-3">
            <li className="rounded-xl bg-paper p-4">
              <KeyRound className="mb-1 size-5 text-accent" aria-hidden />
              <b>依頼者の Google ドライブに置きます</b>
              <p className="mt-1 text-[13px] text-sub">GAS とスプレッドシートは、依頼者のドライブに置きます。契約が終わっても、依頼者の手元で動き続けます。</p>
            </li>
            <li className="rounded-xl bg-paper p-4">
              <MousePointerClick className="mb-1 size-5 text-accent" aria-hidden />
              <b>許可のボタンを1回押していただきます</b>
              <p className="mt-1 text-[13px] text-sub">求める権限は、YouTube の数値の読み取りだけです。動画の編集やコメントの書き込みの権限は求めません。</p>
            </li>
            <li className="rounded-xl bg-paper p-4">
              <Sunrise className="mb-1 size-5 text-accent" aria-hidden />
              <b>あとは毎朝、自動で動きます</b>
              <p className="mt-1 text-[13px] text-sub">失敗したときはメールでお知らせします。許可の期限が切れたときは、もう一度許可する手順をご案内します。</p>
            </li>
          </ol>
          <p className="mt-3 rounded-lg border border-cond-mark/50 bg-cond-soft px-3.5 py-2.5 text-[13.5px]">
            <b>許可の画面で「このアプリは確認されていません」と出ます。</b>依頼者のために作ったスクリプトで、Google の審査を受けて一般に公開するアプリではないためです。依頼者のアカウントの中だけで動きます。画面の「詳細」から進む手順を、画面の画像つきでご案内します。
          </p>
        </section>

        <section className="card p-5 md:p-6">
          <H2 no={6}>維持費：0円</H2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {COST.map((c) => (
              <li key={c.name} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5">
                <span>
                  <b className="text-[14px]">{c.name}</b>
                  <span className="block text-[12px] text-sub">{c.note}</span>
                </span>
                <span className="text-[14px] font-black whitespace-nowrap text-ok">無料</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-sub">有料のコネクタ（月額のもの）は使いません。</p>
        </section>

        <section className="card p-5 md:p-6">
          <H2 no={7}>GAS のコードの作成例</H2>
          <p>
            毎朝の取得、直近5日分の上書き、6分の制限を超えないための区切りと続きの予約、失敗の通知を、ファイルに分けて書いた作成例です。GAS の機能を偽物に差し替えた単体テストつきです。
          </p>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn mt-3 break-all">
            <ExternalLink className="size-4 shrink-0" aria-hidden />
            {GITHUB_URL}（gas/ のフォルダ）
          </a>
        </section>

        <section className="card p-5 md:p-6">
          <H2 no={8}>テストの結果</H2>
          <ul className="space-y-1.5" data-testid="test-results">
            {TEST_RESULTS.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-accent" />
                {t}
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5 md:p-6">
          <H2 no={9}>写真の出典</H2>
          <p>
            料理と台所の写真は、
            <a className="underline underline-offset-2" href="https://www.pakutaso.com/" target="_blank" rel="noreferrer">
              ぱくたそ（www.pakutaso.com）
            </a>
            のフリー素材です。動画のサムネイルの代わりに使っています。
          </p>
        </section>
      </article>
    </Shell>
  );
}
