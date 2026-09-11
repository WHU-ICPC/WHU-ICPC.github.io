# WHU ACM-ICPC

武汉大学 ACM-ICPC 协会的静态展示网站，可直接部署至 GitHub Pages，无需构建工具或后端服务。

网站包含以下内容：

- **奖牌陈列室**：按赛季汇总队伍在 ICPC、CCPC 等赛事中的获奖记录；支持查看队员个人记录和单场赛事记录。
- **World Finals 标记**：在对应赛季和队伍旁显示 WF 出线标识。
- **一血标记**：在奖项记录中展示指定题目的一血气球。
- **社团与竞赛简介**：在站内嵌入展示协会简介 PDF。
- **比赛日历**：按月展示比赛安排，并显示比赛类型、城市和学校。
- **往届活动存档**：以目录树展示历届赛事榜单、通知、积分方案等 HTML、PDF 或 MHTML 文件。

## 本地预览

在仓库根目录启动本地静态服务器：

```powershell
python -m http.server 8000
```

然后打开 `http://localhost:8000`。页面会通过 `fetch` 读取 `data/` 下的 JSON 文件，因此不能直接双击 `index.html` 预览。

## 目录说明

```text
assets/              网站图标等静态资源
boards/              社团简介和往届活动的 HTML、PDF、MHTML 等展示文件
data/                页面使用的 JSON 数据
index.html           页面结构
script.js            页面交互与数据渲染逻辑
styles.css           页面样式
```

## 维护数据

所有 JSON 文件必须为有效 JSON，使用 UTF-8 编码，并保持字段名称不变。

### 奖项记录

奖项数据维护在 `data/awards.json`。每条记录包含赛季、赛事、队伍、队员、奖项和名次：

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

`award` 只能是 `金`、`银` 或 `铜`；没有可用名次时将 `rank` 设为 `null`。

冠军、亚军、季军属于金奖。在相应金奖记录中增加可选字段 `podium` 后，页面会显示该称号，并在赛季统计中单列统计；同时仍会计入金奖总数：

```json
{
  "award": "金",
  "podium": "冠军"
}
```

`podium` 只能是 `冠军`、`亚军`、`季军`，且只能用于 `award` 为 `金` 的记录。

### World Finals 出线记录

出线记录维护在 `data/wf.json`：

```json
{
  "season": "2025-2026",
  "team": "秘封俱乐部"
}
```

### 一血记录

一血记录维护在 `data/first_blood.json`，并通过赛季、赛事和队伍与奖项记录对应：

```json
{
  "season": "2025-2026",
  "contest": "ICPC 南京",
  "team": "很弱的低手",
  "problem": "C",
  "color": "#008000",
  "textColor": "#000000"
}
```

### 往届活动存档

活动目录维护在 `data/boards.json`。叶节点的 `path` 指向仓库中 `boards/` 下的文件；可指向 HTML、PDF 或 MHTML。带 `children` 的节点会显示为可展开目录。

```json
{
  "title": "2026暑假集训",
  "children": [
    {
      "title": "暑假集训通知",
      "path": "boards/2026暑假集训/暑假集训通知.pdf"
    },
    {
      "title": "round1-拉美大奖赛",
      "path": "boards/2026暑假集训/round1/index.html"
    }
  ]
}
```

新增文件时，请先将文件放入合适的 `boards/` 子目录，再在 `data/boards.json` 中添加对应的叶节点。

### 比赛日历

比赛日历维护在 `data/calendar.json`。每个事件需要填写日期、比赛类型、举办城市和学校；日期格式为 `YYYY-MM-DD`。修改后提交并部署，日历会自动在对应日期显示赛事。

```json
{
  "events": [
    {
      "date": "2026-09-12",
      "type": "ICPC 区域赛",
      "city": "南京",
      "school": "南京理工大学"
    }
  ]
}
```

## 更新社团简介

站内“社团与竞赛简介”入口固定展示 `boards/社团与竞赛简介.pdf`。替换简介时请使用同名 PDF 覆盖该文件，以保持链接不变。
