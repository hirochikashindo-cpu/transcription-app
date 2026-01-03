# [P2] テストカバレッジ閾値の調整

## 問題の説明

vitest.config.tsで80%カバレッジが設定されていますが、MVP段階では達成困難です。

## 実装提案

Phase 1では70%に調整:
```typescript
thresholds: {
  lines: 70,
  functions: 70,
  branches: 70,
  statements: 70,
}
```

Phase 2で80%に引き上げ。

## 受け入れ基準

- [ ] vitest.config.tsが更新されている
- [ ] CIが成功する
- [ ] ドキュメントに記載されている

## ラベル

`priority:p2`, `type:enhancement`, `phase:1`
