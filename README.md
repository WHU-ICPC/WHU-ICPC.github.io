# WHU ACM-ICPC Awards

武汉大学 ACM-ICPC 协会的静态奖项展示页。页面无需构建工具，可直接部署到 GitHub Pages。

## 本地预览

```powershell
python -m http.server 8000
```

打开 `http://localhost:8000`。由于页面通过 `fetch` 读取数据，不能直接双击 `index.html` 预览。

## 更新数据

当前数据以 `data/` 目录为准。奖项记录维护在 `data/awards.json`，World Finals 出线记录维护在 `data/wf.json`。

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

WF 出线记录格式：

```json
{
  "season": "2025-2026",
  "team": "秘封俱乐部"
}
```

往届活动榜单的目录索引维护在 `data/boards.json`，每个叶节点的 `path` 指向 `boards/` 下对应的 Domjudge `index.html`：

```json
{
  "title": "round4-横滨大奖赛",
  "path": "boards/2026暑假集训/round4-横滨大奖赛/index.html"
}
```
