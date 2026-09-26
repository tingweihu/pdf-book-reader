[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

# PDF Book Reader

[ライブデモ](https://pdf-book-reader-tau.vercel.app) · [GitHub リポジトリ](https://github.com/tingweihu/pdf-book-reader)

PDF Book Reader は、誌面デザインされた文書を読むためのオープンソース PDF リーダーです。PDF だけで使い始められます。目次、ブランド表示、配色、ページの扱いを指定したい場合は、任意の `book.json` を追加できます。

## このプロジェクトが解決すること

書籍や冊子の PDF には、縦長の単ページと、左右の内容がすでに一枚に組まれた横長ページが混在します。**PDF の 1 ページを文書の 1 ページとして扱います。**デスクトップでは横長ページを丸ごと表示し、狭い画面では検出または指定された見開きを*同じ PDF ページ*の左・右セグメントとして順に読めます。別々の PDF ページを組み合わせて見開きにはしません。

## 主な機能と用途

- CSS 3D の表紙を使ったホーム、ページ送りとキーボード操作、サムネイル、画面に合わせた表示と拡大・移動、全画面表示、ページ遷移、集中モード、動きを抑える設定。
- localStorage にページ単位の読書位置を保存して再開。25／50／75／100% では控えめな通知を表示。システム／ライト／ダークの切り替えはリーダー UI のみに適用し、PDF の画像は変えません。
- `book.json` で目次、章の色に合わせたページ送りボタンと背景、発行者とフッターのリンク、テーマ色、ロゴ、ダウンロードリンクを追加できます。
- 書籍、雑誌、年次報告書、ホワイトペーパー、カタログ、ポートフォリオ、ブランドブック、編集型の刊行物、教材、デザインされた PDF レポートに適しています。

## ライブデモ

[Three Moments のライブデモ](https://pdf-book-reader-tau.vercel.app)をご覧ください。デモ内のリポジトリリンクは[公開ソース](https://github.com/tingweihu/pdf-book-reader)を開きます。

## 同梱のデモ刊行物

`Three Moments` は、このリポジトリのために制作した架空のデモコンテンツです。実在する出版物、企業、クライアント、団体、商用製品を表すものではありません。ブランド表現、食に関する内容、画像、誌面デザインはいずれもデモ用です。

`public/EXAMPLE_*` は差し替え可能なデモ素材です。`EXAMPLE_BOOK.pdf`、`EXAMPLE_BOOK.json`、デモの favicon も兼ねる `EXAMPLE_MARK.png`、`EXAMPLE_CHAPTER_01.png`、`EXAMPLE_CHAPTER_02.png`、`EXAMPLE_CHAPTER_03.png` が含まれます。`public/favicon.svg` はリーダーの中立的な標準アイコンです。

## クイックスタート

プロジェクトをクローンまたはダウンロードしたら、次の手順で起動できます。

1. `npm install` を実行します。
2. 手元の PDF を `public/book.pdf` として配置します。
3. `npm run dev` を実行し、Vite が表示する URL を開きます。

リーダーのコードを変更する必要はありません。`book.pdf` は `EXAMPLE_BOOK.pdf` より優先されます。自分の PDF は設定なしでも読めます。デモ設定は PDF のフィンガープリントで対象が限定されており、別の PDF では通知なしで無視されます。刊行物の情報を設定したいときだけ `public/book.json` を追加してください。

## 設定なしで使う

自分の刊行物に必要なのは `public/book.pdf` だけです。置かれていなければ同梱の `EXAMPLE_BOOK.pdf` が開きます。ページ数とサイズは実行時に取得します。ホーム、ページ送り、サムネイル、拡大・移動、全画面表示、集中モード、外観切り替え、ローカルの読書位置保存は利用できます。一致するメタデータがなければタイトルと配色は中立的になり、目次と設定されたリンクは表示されません。

## 任意の `book.json`

`public/` に PDF と並べて `book.json` を置くと、タイトル／サブタイトル、表紙、ロゴ、目次の章・項目、配色、ダウンロードリンク、`layoutOverrides` を指定できます。ページ番号は 1 始まりです。

```json
{
  "title": "Field Notes",
  "chapters": [{"id": "intro", "title": "Introduction", "startPage": 1, "color": "#345C7D"}],
  "theme": {"accent": "#345C7D"},
  "layoutOverrides": [
    {"page": 2, "mode": "single"},
    {"startPage": 3, "endPage": 4, "mode": "spread"}
  ],
  "downloads": [{"label": "PDF", "href": "/book.pdf"}]
}
```

縦長ページは既定で単ページ、十分に幅広い横長ページは見開き候補になります。横長ページを狭い画面でも一枚のまま見せたい場合は `layoutOverrides` で `single`、同じページの左右に分けて読みたい場合は `spread` を指定してください。デスクトップでは常に PDF の 1 ページを丸ごと表示します。任意の `pdfFingerprint` で設定を特定の PDF に紐づけられます。

任意の `cover` はホームに表示する画像または PDF ページを指定します。`branding.logo` と `branding.favicon`、`chapters[].background`、`publisher`（名前／ロゴ／サイト）、`socialLinks`（サイト／Facebook／Instagram／LinkedIn／X）、`legal`（プライバシー／利用規約）、`project.repositoryUrl` は指定されたものだけ表示され、URL は検証されます。設定の優先順は `book.json` → `publication.json`（互換用）→ `EXAMPLE_BOOK.json` → 中立的な初期設定です。優先度の高いファイルの形式が不正な場合は警告を表示し、次の設定へ勝手に切り替えません。

## ディレクトリ構成

```text
public/   自分の book.pdf／book.json、差し替え可能な EXAMPLE_* 素材
src/      汎用リーダーと PDF 描画処理
tests/    自動テストと別内容の PDF テストファイル
scripts/  PDF ページの寸法確認
docs/     設計、公開、ローカル確認の資料
```

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | 型を検査して本番用ファイルを生成 |
| `npm run preview` | 本番ビルドをローカルで確認 |
| `npm run typecheck` | TypeScript と JSDoc の型を検査 |
| `npm test` | 自動テストを実行 |
| `npm run inspect:pdf` | book.pdf の寸法と表示モードを出力。なければデモ PDF を確認 |

## 制限事項

見開きの自動判定は推定です。合わないページには `layoutOverrides` を設定してください。読書位置は現在のブラウザー内に保存され、ストレージが使えない環境では再開できません。クラウド同期や PDF アップロード画面はありません。[設計メモ](docs/architecture.md)と[ローカル確認リスト](docs/LOCAL_REVIEW.md)も参照してください。

## ライセンス

ソースコードは [MIT](LICENSE)、同梱のデモ刊行物素材は [CC BY 4.0](ASSET_PROVENANCE.md) です。外部依存パッケージにはそれぞれのライセンスが適用されます。
