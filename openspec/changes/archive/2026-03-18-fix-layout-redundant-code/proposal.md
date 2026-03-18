## Why

`themes/minima/layout/layout.ejs` 中存在两处代码异味：冗余的双重赋值 (`var title = title = config.title`) 和重复的 `.replace()` 调用（相同正则执行两次，第二次永远不会匹配）。这些不影响运行，但降低代码可读性，给维护者造成困惑。

## What Changes

- 修复第 18 行的冗余双重赋值为单次赋值
- 修复第 33、62、78 行重复的 `.replace()` 调用，去掉无效的第二次调用

## Capabilities

### New Capabilities
- `clean-redundant-code`: 清理 layout.ejs 中的冗余代码模式

### Modified Capabilities
<!-- None -->

## Impact

- `themes/minima/layout/layout.ejs`: 4 处修改，纯清理，零行为变更
