[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

# PDF Book Reader

[線上展示](https://pdf-book-reader-tau.vercel.app) · [GitHub 儲存庫](https://github.com/tingweihu/pdf-book-reader)

PDF Book Reader 是一套適合編排型文件的開源 PDF 閱讀器。只要放入一份 PDF 就能閱讀；如需目錄、品牌資訊、色彩與版面指定，再加入選用的 `book.json`。

## 為什麼需要它

書籍與刊物的 PDF 常同時有直式單頁，以及已經排成完整左右跨頁的橫式頁面。**一個 PDF 頁面就是一個文件頁面。**桌面版保留該橫式頁面的完整畫面；窄螢幕可把偵測或指定的跨頁，依序讀成*同一頁*的左、右兩段。閱讀器不會把兩個不相關的 PDF 頁面拼成跨頁。

## 主要功能與適用內容

- CSS 3D 書封首頁、翻頁與鍵盤操作、縮圖、適頁與縮放／拖曳、全螢幕、翻頁過場、聚焦模式及減少動態效果。
- 以 localStorage 保存頁面進度並續讀，在 25／50／75／100% 顯示輕量提示。系統／淺色／深色模式只改變閱讀器介面，不改動 PDF 畫面。
- 可透過 `book.json` 加入目錄、章節色彩的翻頁按鈕與背景、出版者及頁尾連結、主題色、Logo 和下載連結。
- 適用於書籍、雜誌、年報、白皮書、型錄、作品集、品牌手冊、編輯式刊物、教材及有版面設計的 PDF 報告。

## 線上展示

瀏覽 [Three Moments 線上展示](https://pdf-book-reader-tau.vercel.app)。展示中的儲存庫連結會開啟[公開原始碼](https://github.com/tingweihu/pdf-book-reader)。

## 隨附的示範刊物

`Three Moments` 是專為本儲存庫製作的虛構示範內容，不代表真實出版品、公司、客戶、組織或商業產品。其品牌識別、飲食內容、影像與刊物設計均僅供展示。

`public/EXAMPLE_*` 是可替換的示範素材：`EXAMPLE_BOOK.pdf`、`EXAMPLE_BOOK.json`、兼作示範 favicon 的 `EXAMPLE_MARK.png`，以及 `EXAMPLE_CHAPTER_01.png`、`EXAMPLE_CHAPTER_02.png`、`EXAMPLE_CHAPTER_03.png`；`public/favicon.svg` 則是閱讀器的中性預設圖示。

## 快速開始

複製或下載專案後：

1. 執行 `npm install`。
2. 將自己的 PDF 放到 `public/book.pdf`。
3. 執行 `npm run dev`，開啟 Vite 顯示的網址。

不必修改閱讀器程式。`book.pdf` 優先於 `EXAMPLE_BOOK.pdf`；自己的 PDF 即使沒有設定也能閱讀。示範設定綁定示範 PDF 的指紋，遇到不同 PDF 會安靜略過。需要自訂刊物資訊時，再加入 `public/book.json`。

## 零設定模式

自己的刊物只需要 `public/book.pdf`；若未放入，會開啟隨附的 `EXAMPLE_BOOK.pdf`。閱讀器會即時取得頁數與版面資訊。首頁、翻頁、縮圖、縮放／拖曳、全螢幕、聚焦模式、明暗模式及本機進度仍可使用。沒有相符設定時，標題與主題採中性樣式；目錄和設定型連結不顯示。

## 選用的 `book.json`

將 `book.json` 放在 `public/`，與 PDF 並列。可設定標題／副標、封面、Logo、目錄章節與項目、主題色、下載連結及 `layoutOverrides`。頁碼從 1 開始。例如：

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

直式頁面預設為單頁；夠寬的橫式頁面會被視為跨頁候選。若橫式頁面在窄螢幕仍應完整顯示，請以 `layoutOverrides` 指定 `single`；若應分成同一頁的左、右兩段，指定 `spread`。桌面永遠一次顯示一個完整 PDF 頁面。選用的 `pdfFingerprint` 可讓設定綁定特定 PDF。

選填的 `cover` 可指定首頁圖片或 PDF 頁面；`branding.logo` 與 `branding.favicon`、`chapters[].background`、`publisher`（名稱／Logo／網站）、`socialLinks`（網站／Facebook／Instagram／LinkedIn／X）、`legal`（隱私／條款）與 `project.repositoryUrl` 只會顯示已提供的內容。網址會先驗證。設定優先順序為 `book.json` → `publication.json`（相容用）→ `EXAMPLE_BOOK.json` → 中性預設；較高優先順序的檔案若格式錯誤，會顯示警告，不會悄悄套用後者。

## 專案結構

```text
public/   自己的 book.pdf／book.json 與可替換的 EXAMPLE_* 示範素材
src/      通用閱讀器及 PDF 渲染程式
tests/    自動化測試與非示範 PDF 測試檔
scripts/  PDF 頁面尺寸檢查
docs/     架構、發布及本機檢閱說明
```

## 指令

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 啟動開發伺服器 |
| `npm run build` | 檢查型別並產生正式版檔案 |
| `npm run preview` | 在本機預覽正式版 |
| `npm run typecheck` | 檢查 TypeScript 與 JSDoc 型別 |
| `npm test` | 執行自動化測試 |
| `npm run inspect:pdf` | 列出 book.pdf 的頁面尺寸與模式；若未放入則檢查示範 PDF |

## 目前限制

跨頁自動判斷是啟發式規則；判斷不符時請使用 `layoutOverrides`。進度只存在目前瀏覽器，若瀏覽器封鎖儲存空間便無法續讀。本專案不含雲端同步或 PDF 上傳介面。詳見[架構說明](docs/architecture.md)與[本機檢閱清單](docs/LOCAL_REVIEW.md)。

## 授權

原始碼採 [MIT](LICENSE)；隨附示範刊物素材採 [CC BY 4.0](ASSET_PROVENANCE.md)。第三方相依套件各自維持原有授權。
