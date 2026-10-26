#!/bin/sh
# Finder starts .command files in Terminal; include common Node installer locations.
PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export PATH
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "请先安装 Node.js 24.12 或更新版本，再重新双击。"
  open https://nodejs.org/en/download
  printf '按回车关闭窗口…'
  read -r answer
  exit 1
fi
exec sh ./start-workbench.sh "$@"
