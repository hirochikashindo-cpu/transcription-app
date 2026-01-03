# [P2] Node.jsバージョンをpackage.jsonに明記

## 問題の説明

- Claude.md: "Node.js 18.x以上"
- 実際: Node.js 20.19.6
- package.json: engines指定なし

## 実装提案

package.jsonに追加:
```json
"engines": {
  "node": ">=20.0.0",
  "npm": ">=9.0.0"
}
```

## 受け入れ基準

- [ ] package.jsonにengines指定がある
- [ ] Claude.mdの記載と整合している
- [ ] CI/CDで正しいバージョンが使われている

## ラベル

`priority:p2`, `type:documentation`, `phase:1`
