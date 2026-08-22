# WHU ACM-ICPC Awards

武汉大学 ACM-ICPC 协会的静态奖项展示页。页面无需构建工具，可直接部署到 GitHub Pages。

## 本地预览

```powershell
python -m http.server 8000
```

打开 `http://localhost:8000`。由于页面通过 `fetch` 读取数据，不能直接双击 `index.html` 预览。

## 更新数据

原始数据位于 `init/awards.json` 和 `init/WHU-XCPC 2021-2025暑假集训排名和后续成绩.xlsx`。更新原始文件后运行：

```powershell
python tools/build_awards.py
```

脚本会把两份来源清洗为 `data/awards.json`，并将社团 Logo 复制到 `assets/logo.svg`。2021–2026 赛季以 Excel 的队伍、队员、奖项和比赛名次为准，更早赛季来自 JSON；铁牌和非金银铜条目会被过滤。

每条记录只包含以下字段：

```json
{
  "season": "2025-2026",
  "contest": "ICPC 南京",
  "team": "秘封俱乐部",
  "members": ["李佳隆", "潘非", "熊师飏"],
  "award": "金",
  "rank": 11
}
```
