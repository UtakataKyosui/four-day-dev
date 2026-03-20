# Codex Sub-Agent Guide

このリポジトリでは `.claude/agents/*.md` と `.claude/commands/*.md` を、Codex の sub-agent 運用に読み替えて使う。
Claude 固有の `Agent` / `TeamCreate` / `/command` はそのままでは実行できないため、Codex では `spawn_agent` と通常のファイル参照で意図を再現する。

## 基本方針

- sub-agent を起動する前に、まずメインの Codex が `CLAUDE.md`、`CLAUDE.repo.md`、`.claude/Progress.md` を読んでタスクの文脈を固める
- Claude の slash command は「対象ファイルを読む」「必要な処理を手順として実行する」に変換する
- `.claude/agents/*.md` は役割定義として扱い、Codex の `spawn_agent` に最も近い agent type を選ぶ
- 各 sub-agent への指示には、必要なファイルパスと期待する出力形式を明示する

## 事前読込ルール

Claude 側で「最初に `/addf-knowhow-index` を実行する」と書かれている場合、Codex では次に読み替える。

1. `docs/knowhow/INDEX.addf.md` があればそれを読む
2. 無ければ `docs/knowhow/INDEX.md` を読む
3. 必要な knowhow だけ追加で開く

このリポジトリは ADDF フレームワーク本体なので、通常は `docs/knowhow/INDEX.addf.md` を優先する。

## 対応表

| Claude 側 | 主用途 | Codex での扱い |
|---|---|---|
| `addf-knowhow-agent` | Plan に関連する knowhow の絞り込み | `spawn_agent(agent_type="explorer")` で使う |
| `addf-code-review-agent` | 変更差分のレビュー | `spawn_agent(agent_type="explorer")` かメインでレビュー |
| `addf-security-review-agent` | セキュリティ観点のレビュー | `spawn_agent(agent_type="explorer")` |
| `addf-contribution-agent` | ADDF 由来変更の識別 | `spawn_agent(agent_type="explorer")` |
| `addf-ui-test-agent` | GUI の視覚確認 | 可能ならメインで実行。必要なら `spawn_agent(agent_type="worker")` |

## 推奨プロンプト

### 1. knowhow 調査

用途: Plan 着手前に関連 knowhow を絞る。

```text
最初に `docs/knowhow/INDEX.addf.md` を読んでください。次に Plan を読み、実装に必要または有用な knowhow だけを列挙してください。各項目は「ファイルパス / 要約 / 関連理由」で返してください。
```

### 2. コードレビュー

用途: 実装後の品質確認。

```text
最初に `docs/knowhow/INDEX.addf.md` を確認してください。その後 `git diff` と変更ファイルを読み、Critical / Warning / Suggestion の順でレビュー結果を返してください。ファイルと行番号を含めてください。
```

### 3. セキュリティレビュー

用途: 認証、入力処理、外部連携、秘密情報を含む変更の確認。

```text
最初に `docs/knowhow/INDEX.addf.md` を確認してください。その後 `git diff` と変更ファイルを読み、Critical / High / Medium / Low / Info の順で脆弱性を報告してください。各項目に該当箇所、問題、攻撃シナリオ、修正案を含めてください。
```

### 4. コントリビューション分析

用途: ADDF 本体にアップストリーム化すべき変更の判定。

```text
最初に `docs/knowhow/INDEX.addf.md` と `docs/knowhow/ADDF/upstream-downstream-separation.md` を読んでください。その後 `git diff` を分析し、分離パターン違反の有無、ADDF 由来の変更、プロジェクト固有の変更、コントリビューション提案を返してください。
```

## spawn_agent の使い分け

- `explorer`: 読み取り中心の分析。knowhow 選別、レビュー、差分分類に使う
- `worker`: 実装、テスト、GUI 操作のように実作業が必要なときに使う
- メインでやるべきこと: 直近のクリティカルパスにある判断、複数 sub-agent の結果統合、最終編集

## 運用上の注意

- すぐ次の手がその結果に依存する場合は、むやみに委譲せずメインで進める
- `.claude/agents/*.md` の役割文は尊重するが、Codex のツール制約に合わせて出力形式を優先する
- `.claude/commands/*.md` は slash command としては実行できない。必要なファイルを読み、同じ目的を満たす
- `addf-contribution-agent` はこのリポジトリが ADDF 本体である都合上、常に高い価値があるわけではない。`.claude/Feedback.md` の注意書きを優先する
