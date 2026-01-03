#!/bin/bash

# GitHub Issues Deployment Script
# このスクリプトは .github/issues/ ディレクトリ内のマークダウンファイルから
# GitHub Issueを自動作成します

set -e

REPO_OWNER="hirochikashindo"
REPO_NAME="transcription-app"
ISSUES_DIR=".github/issues"

# カラーコード
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== GitHub Issues Deployment ===${NC}\n"

# GitHub CLIの確認
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    echo "Install it with: brew install gh"
    exit 1
fi

# GitHub認証の確認
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}GitHub CLI is not authenticated.${NC}"
    echo "Please run: gh auth login"
    exit 1
fi

# リポジトリの設定確認
CURRENT_REPO=$(git remote get-url origin 2>/dev/null || echo "")
if [[ -z "$CURRENT_REPO" ]]; then
    echo -e "${YELLOW}Warning: No git remote found${NC}"
    echo "Setting up remote repository..."
    git remote add origin "https://github.com/${REPO_OWNER}/${REPO_NAME}.git" || true
fi

echo -e "${GREEN}Repository: ${REPO_OWNER}/${REPO_NAME}${NC}\n"

# Issueファイルの取得
ISSUE_FILES=$(find "${ISSUES_DIR}" -name "*.md" -not -name "issues-plan.md" | sort)

if [[ -z "$ISSUE_FILES" ]]; then
    echo -e "${RED}No issue files found in ${ISSUES_DIR}${NC}"
    exit 1
fi

ISSUE_COUNT=$(echo "$ISSUE_FILES" | wc -l | tr -d ' ')
echo -e "Found ${GREEN}${ISSUE_COUNT}${NC} issue files\n"

# 各Issueファイルを処理
CREATED=0
SKIPPED=0

for FILE in $ISSUE_FILES; do
    FILENAME=$(basename "$FILE")
    echo -e "Processing: ${YELLOW}${FILENAME}${NC}"

    # タイトルを抽出（最初の見出し）
    TITLE=$(grep -m 1 "^# " "$FILE" | sed 's/^# //')

    if [[ -z "$TITLE" ]]; then
        echo -e "${RED}  ✗ No title found, skipping${NC}\n"
        ((SKIPPED++))
        continue
    fi

    # ラベルを抽出
    LABELS=$(grep "^## ラベル" -A 1 "$FILE" | tail -n 1 | sed 's/`//g' | tr ',' '\n' | tr -d ' ')

    # マイルストーンを抽出
    MILESTONE=$(grep "^## マイルストーン" -A 1 "$FILE" | tail -n 1 | tr -d ' ')

    # Issue本文（ラベルとマイルストーンセクションを除く）
    BODY=$(sed '/^## ラベル/,/^## マイルストーン/d; /^## マイルストーン/,$d' "$FILE")

    # Issueを作成
    echo "  Creating issue: $TITLE"

    # ラベルオプションの構築
    LABEL_OPTS=""
    if [[ -n "$LABELS" ]]; then
        while IFS= read -r label; do
            LABEL_OPTS="$LABEL_OPTS --label \"$label\""
        done <<< "$LABELS"
    fi

    # マイルストーンオプション
    MILESTONE_OPT=""
    if [[ -n "$MILESTONE" ]]; then
        MILESTONE_OPT="--milestone \"$MILESTONE\""
    fi

    # Issue作成コマンド
    if eval gh issue create \
        --repo "${REPO_OWNER}/${REPO_NAME}" \
        --title \""$TITLE"\" \
        --body \""$BODY"\" \
        $LABEL_OPTS \
        $MILESTONE_OPT; then
        echo -e "${GREEN}  ✓ Created successfully${NC}\n"
        ((CREATED++))
    else
        echo -e "${RED}  ✗ Failed to create${NC}\n"
        ((SKIPPED++))
    fi

    # API レート制限を避けるための待機
    sleep 2
done

echo -e "\n${GREEN}=== Summary ===${NC}"
echo -e "Created: ${GREEN}${CREATED}${NC}"
echo -e "Skipped: ${YELLOW}${SKIPPED}${NC}"
echo -e "Total: ${ISSUE_COUNT}"

if [[ $CREATED -gt 0 ]]; then
    echo -e "\n${GREEN}✓ Issues deployed successfully!${NC}"
    echo -e "View issues at: https://github.com/${REPO_OWNER}/${REPO_NAME}/issues"
else
    echo -e "\n${YELLOW}No issues were created${NC}"
fi
