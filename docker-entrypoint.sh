#!/bin/sh
set -e

echo "=== MAA WebUI Docker 启动脚本 ==="

# 检查 MaaCore 是否已安装
if ! maa version 2>/dev/null | grep -q "MaaCore"; then
    echo "⚠️  MaaCore 未安装或损坏，开始安装..."
    echo "这可能需要几分钟时间，请耐心等待..."
    
    # 强制安装 MaaCore（避免残留文件导致的问题）
    if maa install --force; then
        echo "✅ MaaCore 安装成功"
    else
        echo "❌ MaaCore 安装失败，但服务仍会启动"
        echo "你可以稍后在 WebUI 中手动更新"
    fi
else
    echo "✅ MaaCore 已安装"
    maa version
fi

echo "=== 启动 Node.js 服务器 ==="
exec "$@"
