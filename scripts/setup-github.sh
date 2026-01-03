#!/bin/bash

# GitHub Repository Setup Script
# このスクリプトはGitHubリポジトリのセットアップとissueのデプロイを行います

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== GitHub Repository Setup ===${NC}\n"

# Step 1: GitHub CLI認証
echo -e "${YELLOW}Step 1: GitHub CLI Authentication${NC}"
if ! gh auth status &> /dev/null; then
    echo "Please authenticate with GitHub..."
    gh auth login
else
    echo -e "${GREEN}✓ Already authenticated${NC}"
fi

echo ""

# Step 2: リポジトリ作成
echo -e "${YELLOW}Step 2: Repository Creation${NC}"
REPO_NAME="transcription-app"

# リポジトリが既に存在するか確認
if gh repo view "hirochikashindo/${REPO_NAME}" &> /dev/null; then
    echo -e "${GREEN}✓ Repository already exists${NC}"
else
    echo "Creating repository..."
    gh repo create "hirochikashindo/${REPO_NAME}" \
        --public \
        --description "Audio transcription and meeting minutes application" \
        --clone=false || true
    echo -e "${GREEN}✓ Repository created${NC}"
fi

echo ""

# Step 3: Git設定
echo -e "${YELLOW}Step 3: Git Configuration${NC}"

# リモートの設定
if git remote get-url origin &> /dev/null; then
    echo -e "${GREEN}✓ Remote already configured${NC}"
else
    git remote add origin "https://github.com/hirochikashindo/${REPO_NAME}.git"
    echo -e "${GREEN}✓ Remote configured${NC}"
fi

echo ""

# Step 4: 初期コミット
echo -e "${YELLOW}Step 4: Initial Commit${NC}"

if git log &> /dev/null; then
    echo -e "${GREEN}✓ Repository already has commits${NC}"
else
    echo "Creating initial commit..."
    git add .
    git commit -m "Initial commit: Project setup with CI/CD

- Electron + React + TypeScript stack
- Database schema and services structure
- Testing setup (Vitest + Playwright + MSW)
- CI/CD workflows (GitHub Actions)
- Development environment configuration
- Documentation (Claude.md, CICD.md)
"
    echo -e "${GREEN}✓ Initial commit created${NC}"
fi

echo ""

# Step 5: Push to GitHub
echo -e "${YELLOW}Step 5: Push to GitHub${NC}"

if git push -u origin main 2>&1 | grep -q "Everything up-to-date"; then
    echo -e "${GREEN}✓ Already up to date${NC}"
else
    git push -u origin main
    echo -e "${GREEN}✓ Pushed to GitHub${NC}"
fi

echo ""

# Step 6: ラベル作成
echo -e "${YELLOW}Step 6: Creating Issue Labels${NC}"

# 優先度ラベル
gh label create "priority:p0" --color "d73a4a" --description "Blocker - Must fix before implementation" --force || true
gh label create "priority:p1" --color "ff9800" --description "Critical - Must fix during Phase 1" --force || true
gh label create "priority:p2" --color "ffeb3b" --description "High - Should fix by Phase 1 completion" --force || true
gh label create "priority:p3" --color "cddc39" --description "Medium - Can be addressed in Phase 2+" --force || true

# タイプラベル
gh label create "type:bug" --color "d73a4a" --description "Bug fix" --force || true
gh label create "type:enhancement" --color "a2eeef" --description "New feature or enhancement" --force || true
gh label create "type:documentation" --color "0075ca" --description "Documentation" --force || true
gh label create "type:security" --color "ff5722" --description "Security related" --force || true

# フェーズラベル
gh label create "phase:1" --color "7057ff" --description "Phase 1 - MVP" --force || true
gh label create "phase:2" --color "7057ff" --description "Phase 2 - Extensions" --force || true
gh label create "phase:3" --color "7057ff" --description "Phase 3 - AI Enhancement" --force || true

# コンポーネントラベル
gh label create "component:database" --color "bfd4f2" --description "Database related" --force || true
gh label create "component:ui" --color "bfd4f2" --description "User Interface" --force || true
gh label create "component:whisper" --color "bfd4f2" --description "Whisper API integration" --force || true
gh label create "component:export" --color "bfd4f2" --description "Export functionality" --force || true

echo -e "${GREEN}✓ Labels created${NC}"

echo ""

# Step 7: マイルストーン作成
echo -e "${YELLOW}Step 7: Creating Milestones${NC}"

gh api repos/hirochikashindo/${REPO_NAME}/milestones \
    -X POST \
    -f title="Phase 1 - MVP" \
    -f description="Minimum Viable Product - Core transcription and editing features" \
    -f due_on="2026-02-14T00:00:00Z" || true

gh api repos/hirochikashindo/${REPO_NAME}/milestones \
    -X POST \
    -f title="Phase 2 - Extensions" \
    -f description="Speaker recognition and custom dictionary" || true

gh api repos/hirochikashindo/${REPO_NAME}/milestones \
    -X POST \
    -f title="Phase 3 - AI Enhancement" \
    -f description="AI summary and audio playback" || true

echo -e "${GREEN}✓ Milestones created${NC}"

echo ""
echo -e "${GREEN}=== Setup Complete! ===${NC}\n"
echo -e "Repository: ${BLUE}https://github.com/hirochikashindo/${REPO_NAME}${NC}"
echo -e "\nNext step: Run './scripts/deploy-issues.sh' to create issues"
