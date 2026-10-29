// 構成図（インラインの SVG）。ロゴは使わず、文字の箱で描く
const box = (x: number, y: number, w: number, h: number, title: string, sub: string, fill: string, stroke: string) => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
  <text x="${x + w / 2}" y="${y + h / 2 - 4}" text-anchor="middle" font-size="15" font-weight="700" fill="#1d1b19">${title}</text>
  <text x="${x + w / 2}" y="${y + h / 2 + 16}" text-anchor="middle" font-size="12" fill="#5b5751">${sub}</text>`;
const arrow = (x1: number, y1: number, x2: number, y2: number, color: string) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2.5" marker-end="url(#ah-${color.slice(1)})"/>`;
const marker = (color: string) =>
  `<marker id="ah-${color.slice(1)}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${color}"/></marker>`;

const A = "#a8423b"; // 第2段階（GAS と API）
const N = "#8a857d"; // 第1段階（標準のコネクタ）

export const ARCH_SVG = `<svg viewBox="0 0 860 330" role="img" aria-label="構成図：YouTube Analytics API と Data API から、GAS が毎朝データを取り、スプレッドシートに日次で蓄積し、Looker Studio のレポートに出す。第1段階は標準のコネクタで主要な指標を出す" xmlns="http://www.w3.org/2000/svg" font-family="Noto Sans JP, sans-serif">
  <defs>${marker(A)}${marker(N)}</defs>
  ${box(10, 30, 190, 70, "YouTube Analytics API", "日次の指標、検索、視聴者", "#fff", "#d8d3cc")}
  ${box(10, 120, 190, 70, "YouTube Data API", "動画の一覧、題名、公開日", "#fff", "#d8d3cc")}
  ${box(250, 70, 170, 80, "GAS", "毎朝の自動実行", "#f6e9e6", A)}
  ${box(470, 70, 170, 80, "スプレッドシート", "日次の蓄積", "#fff", "#d8d3cc")}
  ${box(690, 120, 160, 90, "Looker Studio", "レポート（閲覧のリンク）", "#fff", "#1d1b19")}
  ${box(10, 240, 190, 70, "標準のコネクタ", "コードなしで主要な指標", "#f4f2ef", N)}
  ${arrow(200, 65, 248, 98, A)}
  ${arrow(200, 155, 248, 125, A)}
  ${arrow(420, 110, 468, 110, A)}
  ${arrow(640, 120, 688, 145, A)}
  <path d="M200 275 H660 Q680 275 680 255 V215" fill="none" stroke="${N}" stroke-width="2.5" marker-end="url(#ah-${N.slice(1)})"/>
  <text x="430" y="40" text-anchor="middle" font-size="12.5" font-weight="700" fill="${A}">第2段階：検索キーワードと日次の蓄積を足す</text>
  <text x="430" y="296" text-anchor="middle" font-size="12.5" font-weight="700" fill="#5b5751">第1段階：主要な指標を先に出す</text>
  <text x="335" y="178" text-anchor="middle" font-size="11.5" fill="#5b5751">読み取りだけの権限</text>
  <text x="555" y="178" text-anchor="middle" font-size="11.5" fill="#5b5751">直近5日分を毎朝上書き</text>
</svg>`;
