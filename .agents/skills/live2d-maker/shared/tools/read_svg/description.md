只读本次明确提供的 SVG 或指定草稿源码，可复用父图共享曲线。offset 是字符偏移，默认 0；limit 默认 16000，最多 65536。返回 totalCharacters、sha256、nextOffset，nextOffset 非空时按它继续读取同版本后续页。源码分页不等于完整 SVG；读取不修改文件，也不代替 preview_svg 自检。
