module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新機能
        'fix',      // バグ修正
        'docs',     // ドキュメント更新
        'style',    // フォーマット変更（コードの動作に影響しない）
        'refactor', // リファクタリング
        'perf',     // パフォーマンス改善
        'test',     // テスト追加・修正
        'build',    // ビルドシステムや外部依存関係の変更
        'ci',       // CI設定の変更
        'chore',    // その他の変更（ツール設定など）
        'revert',   // コミットの取り消し
      ],
    ],
    'subject-case': [0], // subject のケースを制限しない
  },
}
