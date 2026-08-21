---
name: gravityrunner-commit-log
description: >
  專用於 GravityRunner 專案的完成收尾流程。每當一個 backlog 項目完成，或使用者列出的 bug/issue 修正完成並驗證後，使用此 skill 建立一次獨立 Git commit、自動 push 到目前分支的 origin、在對話中以 100 字內繁體中文說明改動，並把 commit SHA、日期與 50 字以內繁體中文摘要追加到指定 Notion 頁面的表格。觸發於完成 backlog、修 bug、修 issue、準備提交或要求記錄 commit。
---

# GravityRunner Commit Log

## 固定目標

- Git repository：`https://github.com/Davisanity-TW/GravityRunner.git`
- Notion page：`https://app.notion.com/p/Repo-commit-3c34461aa44e80dca41fea79f30add40?source=copy_link`
- Notion page ID：`3c34461aa44e80dca41fea79f30add40`
- commit subject 使用 Conventional Commits；摘要欄位必須是 50 字以內繁體中文。
- 每次 commit 後的對話說明必須使用繁體中文且不超過 100 字；聚焦實際改動與驗證結果。

## 觸發條件

只有在下列任一項「已完成且已驗證」時執行收尾流程：

1. 使用者指定的 backlog 項目完成。
2. 使用者列出的 bug 或 issue 已修正。

不要因為純討論、未完成的半成品、只改本 skill、或與本項目無關的既有工作樹變更而 commit。

## 收尾流程

1. 確認 repo 根目錄與遠端，且 origin 必須指向 `Davisanity-TW/GravityRunner`。
2. 只 stage 本次項目的檔案，先檢查 `git diff --cached`，不得納入 unrelated 變更。
3. 執行與變更規模相稱的專案驗證；驗證失敗不得建立完成 commit。
4. 建立一次獨立的 Conventional Commits commit；不要 amend。
5. 確認目前分支與 origin 後，自動 push 本次 commit：

   ```sh
   git branch --show-current
   git remote get-url origin
   git push origin HEAD
   ```

   只 push 目前分支，不 force push、不改寫遠端歷史。

6. 用 `git log -1 --format='%H%n%h%n%ad%n%s' --date=short` 取得 SHA 與日期，撰寫 50 字以內繁體中文摘要。
7. 先 fetch Notion page；若尚無表格，使用 Notion `update_page` 的 `insert_content` 追加：

   ```markdown
   | 日期 | Commit | 說明 |
   | --- | --- | --- |
   | 2026-08-21 | `abcdef1` | 修正玩家重力切換重複觸發 |
   ```

   已有表格時只追加資料列；追加前比對 SHA，避免重複記錄。使用 Notion 語法不確定時，先讀取 `notion://docs/enhanced-markdown-spec`。
8. 再次 fetch 確認新列存在，並在本次對話回報：commit SHA、push 結果、驗證結果、Notion 記錄結果，以及 100 字內的繁體中文改動說明。不可只回報「已完成」。

## 失敗處理

- Git 驗證、repo 根目錄、遠端或 stage 範圍不明：停止並回報。
- push 失敗：保留本地 commit，不重複 commit；明確回報 commit SHA、遠端錯誤與待重試的 push。
- commit 成功但 Notion 失敗：保留 commit，明確回報待補登的 SHA；後續只補登，不重複 commit。
- 不得捏造 Notion 寫入成功。
