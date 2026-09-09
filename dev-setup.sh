#!/bin/bash

echo "🔴 Setting up TDD Development Environment..."

# Huskyのインストールと初期化
if ! command -v husky &> /dev/null; then
  echo "📦 Installing Husky for Git hooks..."
  npm install --save-dev husky
  npx husky init
fi

# Pre-commit hookの設定
echo "🪝 Setting up pre-commit hook for TDD enforcement..."
npx husky add .husky/pre-commit 'npm test'

# 開発サーバーとテストを同時に起動するスクリプト
echo "📝 Creating TDD development script..."
cat > start-tdd.sh << 'EOF'
#!/bin/bash
echo "🔴 Starting TDD Development Mode..."
echo "===================================="
echo "1. Tests will run automatically on file changes"
echo "2. Development server will start on http://localhost:3000"
echo "3. Any new code must have tests FIRST"
echo "===================================="

# テストをウォッチモードで起動（バックグラウンド）
npm run test:watch &
TEST_PID=$!

# 開発サーバーを起動
npm run dev &
DEV_PID=$!

# 終了時にプロセスをクリーンアップ
trap "kill $TEST_PID $DEV_PID 2>/dev/null" EXIT

# プロセスが終了するまで待機
wait $TEST_PID $DEV_PID
EOF

chmod +x start-tdd.sh

echo "✅ TDD Development Environment Setup Complete!"
echo ""
echo "Usage:"
echo "  ./start-tdd.sh    - Start development with automatic test watching"
echo "  npm run test:tdd  - Run tests in TDD mode"
echo "  npm test          - Run all tests once"
echo ""
echo "Remember: ALWAYS write tests FIRST (RED → GREEN → REFACTOR)"