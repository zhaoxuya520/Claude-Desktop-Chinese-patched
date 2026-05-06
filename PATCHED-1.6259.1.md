# Claude Desktop Chinese Patch for 1.6259.1

This local patch updates the Chinese localization pack for Claude Desktop
`1.6259.1.0` on Windows MSIX installs.

## Changes

- Added 340 missing frontend i18n keys from Claude `1.6259.1.0`.
- Kept desktop and statsig translations fully aligned with the current package.
- Fixed existing punctuation/ellipsis quality warnings in `frontend-zh-CN.json`.
- Added `zh-CN` locale whitelist patching to `Install-Chinese.ps1`.
- Updated standalone install mode so it does not require administrator rights.
- Updated hardcoded-text patch scripts to accept an explicit assets directory.
- Made the third-party description patch skip gracefully when the old target file
  name is not present in newer Claude bundles.

## Validation

- `frontend`: missing keys `0`
- `desktop`: missing keys `0`
- `statsig`: missing keys `0`
- ICU syntax errors: `0`
- `node scripts/quality-zh-cn.js`: `100/100`

## Recommended Install Mode

Use the standalone copy mode:

```bat
scripts\中文安装.bat
```

Then choose:

```text
2. 创建独立副本
```

This keeps the official WindowsApps package untouched.
