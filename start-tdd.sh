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