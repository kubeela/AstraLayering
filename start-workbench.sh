#!/bin/sh
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "请先安装 Node.js 24.12 或更新版本，再重新打开。"
  echo "https://nodejs.org/en/download"
  if command -v xdg-open >/dev/null 2>&1; then xdg-open https://nodejs.org/en/download; fi
  printf '按回车关闭窗口…'
  read -r answer
  exit 1
fi
node scripts/start-workbench.mjs "$@"
result=$?
if [ "$result" -ne 0 ]; then
  printf '按回车关闭窗口…'
  read -r answer
fi
exit "$result"
