# 天氣・股市・匯率儀表板：發布確認事項與固定流程

> 本文件是 `public/study/market` 的發布基準。之後每次更新都必須以本文件為準；任何阻斷 QA FAIL 都不得視為完成。

## 1. 正式入口與發布目的地

- 正式使用者入口：`public/study/market/index.html`
- EdgeOne 正式地址：`https://next-study-static.edgeone.cool/study/market/index.html`
- EdgeOne 綁定來源：`liujianping0329/next-study-static1` 的 `main`
- 日本當日頁：`public/study/market/YYYY-MM-DD.html`
- `index.html` 是第一優先的正式入口；日期頁只是同內容的當日鏡像/歷史備份。
- 每輪必須由同一份最終 HTML 同時生成 `index.html` 與日本當日頁，兩者內容必須完全一致（SHA/hash 一致）。
- 不需要做 EdgeOne 線上讀回驗證。
- 發布完成判定：本輪兩個靜態 HTML 已成功 commit/push 到 `main`，且來源讀回一致。

## 2. 定時任務與執行責任（固定）

- 定時任務由「目前這個 ChatGPT 聊天室」觸發與執行。
- 每次定時任務到點後，必須由聊天室內的執行流程當場重新擷取最新真實資料。
- 不依賴 GitHub Actions、repository workflow、trigger 檔案或其他 repository 內自動化來重新取數或生成頁面。
- 不得只提交 trigger 後等待 GitHub workflow 產生內容。
- 每輪必須在本次聊天執行中完成：取數 → 生成靜態 HTML → QA → 提交指定 HTML。
- repository 僅作為 EdgeOne 綁定來源與靜態 HTML 發布來源，不承擔本流程的定時取數與頁面生成責任。

## 3. 每輪允許提交的檔案（強制白名單）

一般的「更新並發布」執行中，只允許修改/提交以下兩個靜態 HTML：

1. `public/study/market/index.html`
2. `public/study/market/YYYY-MM-DD.html`（日本當日）

除此之外一律不得在一般發布輪次中修改或提交，包括但不限於：

- `.publish-trigger`
- `.refresh-trigger`
- `.refresh-trigger.txt`
- `.github/workflows/*`
- Markdown / checklist
- JSON / JS / CSS 獨立檔
- log / metadata / snapshot / 暫存檔
- 其他 trigger / marker / helper 檔案

發布前必須確認本輪 commit diff 的變更檔案只包含上述兩個 HTML；若出現任何其他檔案，視為 QA FAIL，不得發布。

> 只有使用者明確要求維護確認事項、文件或其他檔案時，才可在該次專門維護操作中修改非 HTML；這不屬於一般「更新並發布」輪次。

## 4. 固定 UI

沿用 2026-09-09 前已確認的舊版重製 UI，不重新設計、不改成 Apple Weather、不改成簡化版。

固定模組順序：

1. 每小時天氣
2. 未來天氣
3. 股市
4. 匯率

固定特徵：淺色中性背景、白卡、可折疊模組、手機友善、股市/匯率保留 1M/1Y 圖表與既有互動。

## 5. 每輪資料必須重新取得

不得沿用舊值、不得猜值、不得插值、不得放 DEMO/TEST。

### 天氣

固定三地：

- 錦糸町
- 渋谷
- 桑名

### 股市

固定四項：

- S&P 500
- QQQM
- 日經 225
- 台灣加權

### 匯率

固定三項：

- USD/JPY
- CNY/JPY
- TWD/JPY

## 6. Plain self-contained HTML

正式 `index.html` 與日本當日頁必須是瀏覽器可直接解析的普通 HTML，HTML/CSS/JS/本輪資料直接存在頁面內。

以下一律禁止，出現即 QA FAIL：

- `atob()` 主頁還原
- `DecompressionStream`
- base64/gzip 主頁 wrapper
- Blob/Response 解壓後重建主畫面
- `document.write()` 還原主頁
- runtime `fetch()` / XHR `_snapshot*.html`
- runtime 讀取其他中繼 HTML/JS/JSON 來組主畫面

## 7. 每小時天氣：手機固定 7 欄

固定欄位：

`時刻｜天氣｜氣溫｜濕度｜降雨%｜雨量｜UV`

要求：

- 360 / 390 / 430 px 必須全部單屏可見。
- 不得出現水平捲動。
- 風速不得獨立成第 8 欄。
- 風速資料仍保留供動畫判定；大風時可顯示在「天氣」欄內。

## 8. UV 固定顯示規則

- UV 欄必須使用太陽/UV icon 或圓形 badge，不能只顯示裸數字。
- 至少保留 `☀` 類太陽 icon 作為主要識別。
- 有可靠 UV 值時，可顯示在 badge 內或緊鄰 icon。
- 360 / 390 / 430 px 手機版也必須保持 icon 清楚可辨。
- 缺少可靠 UV 時顯示淡色太陽/UV icon + `—`，不得虛構數值。

## 9. 「現在」小時高亮：沿用舊版，不重新設計

三個地點都必須依 JST 的「日期 + 小時」找出目前小時並高亮。

固定沿用既有舊版效果：

- 一般現在行：`2px #64748b` 框線
- 下雨現在行：藍色框線
- 高溫現在行：橘色框線
- 時刻右側保留「現在」標籤
- JS 以 JST 日期 + 小時判斷 `.now`

QA 不得只確認 CSS 存在，必須確認最終 DOM/JS 實際會把正確 row 套上 `now`。

- 三地都必須存在正確的目前小時 row（在資料範圍內時）。
- 日期跨日時不得高亮到錯誤日期的同一小時。
- 若目前小時已不在顯示資料範圍內，不得錯誤高亮其他時段。
- 桌面及 360 / 390 / 430 px 都必須生效。

## 10. 18:00 JST 跨日專項

若本輪為每天 18:00 JST 更新：

- 不得只保留當日剩餘時段。
- 三地都必須同時取得隔天逐小時資料。
- 當日 23:00 後必須連續顯示隔天 00:00、01:00、02:00……。
- 00:00 不得顯示成 24:00。
- 必須清楚標示進入隔天（日期/星期分隔或 00:00 附近日期標示）。
- QA 必須逐地確認 23:00 → 隔天 00:00 連續，日期沒有錯位。

## 11. 天氣動畫阻斷 QA

以下動畫/狀態必須保留且實際可動：

- 普通雨
- 豪雨
- 高溫
- 雷雨 / 閃電
- 大風
- 雪
- 暴雪

大風規則固定：

- `wind > 32 km/h` 且非雪況才觸發。
- 32.0 不觸發。
- 32.1+ 觸發。
- 蒲公英本體沿用已確認 C。
- 提亮背景沿用 B。
- 動畫沿用 C。
- 蒲公英尺寸 50%。
- 粒子尺寸 75%。
- 粒子數量與橫向範圍約 1.5 倍。
- 蒲公英位於時間右側，不遮文字。
- 粒子主要在 row 中下半部，由左下往右上擴散。
- 雪況即使風速 >32 也不得觸發蒲公英，改走雪/暴雪效果。

## 12. 版面與互動 QA

每次發布至少確認：

- 360 px 無水平 overflow。
- 390 px 無水平 overflow。
- 430 px 無水平 overflow。
- 桌面無水平 overflow。
- 手機 7 欄逐時天氣單屏完整。
- UV icon/badge 未退化成裸數字。
- 動畫不覆蓋可讀文字。
- 股市 1M / 1Y 圖表可切換並正常繪製。
- 匯率 1M / 1Y 圖表可切換並正常繪製。
- HTML / CSS / JS / keyframes 完整。
- JavaScript syntax check 通過。
- 本輪 commit diff 只包含 `index.html` 與日本當日 HTML。

## 13. 發布流程（固定）

每輪由這個聊天室依序執行：

1. 定時任務在聊天室觸發。
2. 當場重新取得三地天氣、4 股市、3 匯率最新真實資料。
3. 以既有 9/9 前舊版重製 UI 生成 plain self-contained 靜態 HTML。
4. 套用並確認「現在」JST 小時高亮，保持舊版樣式不變。
5. 若為 18:00 JST，加入隔天逐小時資料並完成跨日 QA。
6. 執行全部阻斷 QA；任何 FAIL 必須定位 → 修正 → 重跑，直到 PASS。
7. 用同一份最終 HTML 寫入：
   - `public/study/market/index.html`（正式入口，最高優先）
   - `public/study/market/YYYY-MM-DD.html`（日本當日鏡像）
8. 比對兩個 HTML 內容/hash，必須完全一致。
9. 確認 staged/commit 變更檔案只有上述兩個 HTML；不得包含 trigger、workflow、文件或其他檔案。
10. 將這兩個 HTML commit/push 到 `liujianping0329/next-study-static1` 的 `main`，藉此觸發 EdgeOne 綁定來源更新。
11. 從 GitHub `main` 讀回 `index.html` 與當日頁，確認兩者 SHA/hash 一致，且 `index.html` 確實包含本輪最新資料。
12. Git push 成功且來源讀回一致，即視為本輪發布觸發完成；不需要 EdgeOne 線上讀回，也不要求 GitHub Actions 成功。

## 14. 明確禁止的舊流程

以下做法全部禁止：

- 只修改 `.publish-trigger` 或 `.refresh-trigger` 後宣告發布。
- 依靠 GitHub Actions 重新擷取資料或生成正式頁面。
- 依靠 repository workflow 作為定時任務執行器。
- 提交 trigger/marker 來代替正式 HTML 更新。
- 本輪沒有實際修改 `public/study/market/index.html` 卻宣告「已發布」。
- 只更新日期子頁、沒有同步更新 `index.html`。

## 15. 完成條件

只有以下全部成立才可回報本輪完成：

- 定時任務由本聊天室觸發並完成本輪執行。
- 三地天氣 / 4 股市 / 3 匯率為本輪即時重新取得資料。
- 全部阻斷 QA PASS。
- `public/study/market/index.html` 是本輪最新正式內容。
- `index.html` 與日本當日頁內容/hash 完全一致。
- 本輪提交只包含這兩個靜態 HTML。
- commit/push 到 `main` 成功。
- GitHub 來源讀回兩個 HTML 一致。

`index.html` 永遠是正式入口的第一檢查對象；不得只維護日期子頁。一般發布輪次除了上述兩個靜態 HTML 外，不得提交任何其他檔案。
