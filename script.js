const MEDAL_CLASS = {
  金: "medal-gold",
  银: "medal-silver",
  铜: "medal-bronze",
};

const MEDAL_ORDER = ["金", "银", "铜"];
const collator = new Intl.Collator("zh-CN", { numeric: true });

const seasonList = document.querySelector("#season-list");
const loadingStatus = document.querySelector("#loading-status");
const personDialog = document.querySelector("#person-dialog");
const personName = document.querySelector("#person-name");
const personRecordsBody = document.querySelector("#person-records-body");
const contestDialog = document.querySelector("#contest-dialog");
const contestName = document.querySelector("#contest-name");
const contestRecordsBody = document.querySelector("#contest-records-body");
const menuToggle = document.querySelector("#menu-toggle");
const menuClose = document.querySelector("#menu-close");
const siteSidebar = document.querySelector("#site-sidebar");
const sidebarBackdrop = document.querySelector("#sidebar-backdrop");
const sidebarFolderToggle = document.querySelector(".sidebar-folder-toggle");
const boardTree = document.querySelector("#board-tree");
const pageTitle = document.querySelector("#page-title");
const awardsPage = document.querySelector("#awards-page");
const boardPage = document.querySelector("#board-page");
const boardFrame = document.querySelector("#board-frame");

let records = [];
let wfQualifications = [];
let firstBloodIndex = new Map();
let boardTreeData = [];
let activeBoardPath = "";

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function seasonLabel(season) {
  return season.replace("-", "—");
}

function seasonStart(season) {
  return Number.parseInt(season.split("-")[0], 10);
}

function countMedals(items) {
  const counts = { 金: 0, 银: 0, 铜: 0 };
  for (const item of items) counts[item.award] += 1;
  return counts;
}

function validateRecords(data) {
  if (!Array.isArray(data)) throw new Error("奖项数据不是数组");

  return data.map((record) => {
    const validAward = MEDAL_ORDER.includes(record.award);
    const validRank = record.rank === null || Number.isInteger(record.rank);
    if (
      !record.season ||
      !record.contest ||
      !record.team ||
      !Array.isArray(record.members) ||
      record.members.length === 0 ||
      !validAward ||
      !validRank
    ) {
      throw new Error("发现格式不正确的奖项记录");
    }
    return record;
  });
}

function validateWfQualifications(data) {
  if (!Array.isArray(data)) throw new Error("WF 数据不是数组");

  return data.map((qualification) => {
    if (!qualification.season || !qualification.team) {
      throw new Error("发现格式不正确的 WF 记录");
    }
    return qualification;
  });
}

function validateFirstBlood(data) {
  if (!Array.isArray(data)) throw new Error("一血数据不是数组");

  return data.map((firstBlood) => {
    if (
      !firstBlood.season ||
      !firstBlood.contest ||
      !firstBlood.team ||
      !firstBlood.problem ||
      !firstBlood.color ||
      !firstBlood.textColor
    ) {
      throw new Error("发现格式不正确的一血记录");
    }
    return firstBlood;
  });
}

function validateBoards(data) {
  if (!Array.isArray(data)) throw new Error("活动存档数据不是数组");

  function validateNodes(nodes) {
    return nodes.map((node) => {
      if (!node.title || (!node.path && !Array.isArray(node.children))) {
        throw new Error("发现格式不正确的活动存档记录");
      }
      if (node.children) {
        if (!Array.isArray(node.children)) throw new Error("活动存档目录格式不正确");
        node.children = validateNodes(node.children);
      }
      return node;
    });
  }

  return validateNodes(data);
}

function recordKey(record) {
  return JSON.stringify([record.season, record.contest, record.team]);
}

function indexFirstBlood(items) {
  const index = new Map();
  for (const item of items) {
    const key = recordKey(item);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(item);
  }
  return index;
}

function boardNodeByPath(nodes, path) {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = boardNodeByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

function boardFormat(path) {
  const extension = path.split(/[?#]/, 1)[0].split(".").pop().toLowerCase();
  if (extension === "pdf") return "pdf";
  if (extension === "mhtml" || extension === "mht") return "mhtml";
  return "html";
}

function renderBoardTree(nodes, parent) {
  for (const node of nodes) {
    if (node.children) {
      const folder = createElement("details", "board-folder");
      const summary = createElement("summary", "board-folder-summary", node.title);
      const children = createElement("div", "board-folder-children");
      folder.append(summary, children);
      parent.append(folder);
      renderBoardTree(node.children, children);
      continue;
    }

    const link = createElement("a", "board-link", node.title);
    link.href = `#board=${encodeURIComponent(node.path)}`;
    link.dataset.boardPath = node.path;
    parent.append(link);
  }
}

function renderBoardMenu() {
  boardTree.replaceChildren();
  renderBoardTree(boardTreeData, boardTree);
}

function setMenuOpen(open) {
  siteSidebar.classList.toggle("is-open", open);
  sidebarBackdrop.hidden = !open;
  siteSidebar.setAttribute("aria-hidden", String(!open));
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
  document.body.classList.toggle("menu-open", open);
}

function renderPage() {
  const hash = window.location.hash;
  const boardMatch = hash.match(/^#board=(.*)$/);
  const boardPath = boardMatch ? decodeURIComponent(boardMatch[1]) : "";
  const board = boardPath ? boardNodeByPath(boardTreeData, boardPath) : null;

  if (board) {
    const format = board.format || boardFormat(board.path);
    activeBoardPath = board.path;
    awardsPage.hidden = true;
    boardPage.hidden = false;
    boardFrame.dataset.format = format;
    if (boardFrame.getAttribute("src") !== board.path) boardFrame.src = board.path;
    boardFrame.title = board.title;
    pageTitle.textContent = board.title;
    document.title = `${board.title} · WHU ACM-ICPC`;
  } else {
    if (activeBoardPath) {
      boardFrame.removeAttribute("src");
      delete boardFrame.dataset.format;
    }
    activeBoardPath = "";
    awardsPage.hidden = false;
    boardPage.hidden = true;
    pageTitle.textContent = "奖牌陈列室";
    document.title = "奖牌陈列室 · WHU ACM-ICPC";
  }

  for (const link of boardTree.querySelectorAll("[data-board-path]")) {
    link.classList.toggle("is-active", link.dataset.boardPath === activeBoardPath);
  }
}

function wfBadge(className = "") {
  const badge = createElement("span", `wf-badge ${className}`.trim(), "WF");
  badge.title = "World Finals";
  badge.setAttribute("aria-label", "World Finals");
  return badge;
}

function seasonWfTeams(season) {
  return wfQualifications
    .filter((qualification) => qualification.season === season)
    .map((qualification) => qualification.team);
}

function medalCountElement(award, count) {
  const item = createElement("span", `medal-count ${MEDAL_CLASS[award]}`);
  item.append(createElement("span", "", award), createElement("strong", "", count));
  return item;
}

function personButton(name) {
  const button = createElement("button", "person-button", name);
  button.type = "button";
  button.dataset.person = name;
  button.setAttribute("aria-label", `查看 ${name} 的获奖记录`);
  return button;
}

function contestButton(contest) {
  const button = createElement("button", "contest-button", contest);
  button.type = "button";
  button.dataset.contest = contest;
  button.setAttribute("aria-label", `查看 ${contest} 的获奖记录`);
  return button;
}

function firstBloodElement(firstBlood) {
  const balloon = createElement("span", "first-blood-balloon", firstBlood.problem);
  balloon.style.setProperty("--balloon-color", firstBlood.color);
  balloon.style.setProperty("--balloon-text", firstBlood.textColor);
  balloon.title = `${firstBlood.problem} 题全场一血`;
  balloon.setAttribute("aria-label", `${firstBlood.problem} 题全场一血`);
  return balloon;
}

function resultElement(record, includeRank = true) {
  const result = createElement("span", `result ${MEDAL_CLASS[record.award]}`);
  result.append(document.createTextNode(`${record.award}奖`));
  if (includeRank && record.rank !== null) {
    result.append(createElement("span", "result-rank", ` · ${record.rank}`));
  }
  for (const firstBlood of firstBloodIndex.get(recordKey(record)) || []) {
    result.append(firstBloodElement(firstBlood));
  }
  result.title =
    record.rank === null ? `${record.award}奖` : `${record.award}奖，第 ${record.rank} 名`;
  return result;
}

function teamScore(team) {
  const counts = countMedals(team.records);
  return [counts.金, counts.银, counts.铜, team.records.length];
}

function compareTeams(left, right) {
  const leftScore = teamScore(left);
  const rightScore = teamScore(right);
  for (let index = 0; index < leftScore.length; index += 1) {
    if (leftScore[index] !== rightScore[index]) return rightScore[index] - leftScore[index];
  }
  return collator.compare(left.team, right.team);
}

function seasonTable(seasonRecords, season) {
  const contests = [...new Set(seasonRecords.map((record) => record.contest))];
  const wfTeams = new Set(seasonWfTeams(season));
  const teams = new Map();

  for (const record of seasonRecords) {
    const key = JSON.stringify([record.team, [...record.members].sort(collator.compare)]);
    if (!teams.has(key)) {
      teams.set(key, {
        team: record.team,
        members: record.members,
        records: [],
        results: new Map(),
      });
    }
    const team = teams.get(key);
    team.records.push(record);
    if (!team.results.has(record.contest)) team.results.set(record.contest, []);
    team.results.get(record.contest).push(record);
  }

  const wrap = createElement("div", "season-table-wrap");
  wrap.tabIndex = 0;
  wrap.setAttribute("role", "region");
  wrap.setAttribute("aria-label", `${seasonLabel(season)} 赛季成绩表，可横向滚动`);

  const table = createElement("table", "season-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const teamHeading = createElement("th", "team-heading", "队伍名");
  const memberHeading = createElement("th", "member-heading", "队员");
  teamHeading.scope = "col";
  memberHeading.scope = "col";
  headRow.append(teamHeading, memberHeading);

  for (const contest of contests) {
    const heading = createElement("th", "contest-heading");
    heading.scope = "col";
    heading.append(contestButton(contest));
    headRow.append(heading);
  }
  head.append(headRow);

  const body = document.createElement("tbody");
  for (const team of [...teams.values()].sort(compareTeams)) {
    const row = document.createElement("tr");
    const teamCell = createElement("td", "team-cell");
    if (wfTeams.has(team.team)) {
      teamCell.append(wfBadge("wf-team-badge"), document.createTextNode(team.team));
    } else {
      teamCell.textContent = team.team;
    }
    row.append(teamCell);

    const membersCell = createElement("td", "member-cell");
    team.members.forEach((member, index) => {
      if (index > 0) membersCell.append(createElement("span", "member-separator", " · "));
      membersCell.append(personButton(member));
    });
    row.append(membersCell);

    for (const contest of contests) {
      const cell = createElement("td", "result-cell");
      for (const record of team.results.get(contest) || []) {
        cell.append(resultElement(record));
      }
      row.append(cell);
    }
    body.append(row);
  }

  table.append(head, body);
  wrap.append(table);
  return wrap;
}

function renderSeason(season, seasonRecords, index) {
  const details = createElement("details", "season");
  details.open = index === 0;

  const summary = document.createElement("summary");
  const title = createElement("span", "season-title");
  title.append(createElement("span", "season-years", seasonLabel(season)));

  const counts = countMedals(seasonRecords);
  const countGroup = createElement("span", "medal-counts");
  const wfTeams = seasonWfTeams(season);
  if (wfTeams.length > 0) {
    countGroup.append(wfBadge("wf-season-badge"));
  } else {
    const placeholder = createElement("span", "wf-season-placeholder");
    placeholder.setAttribute("aria-hidden", "true");
    countGroup.append(placeholder);
  }
  for (const award of MEDAL_ORDER) {
    countGroup.append(medalCountElement(award, counts[award]));
  }

  const toggle = createElement("span", "season-toggle");
  toggle.setAttribute("aria-hidden", "true");
  summary.append(title, countGroup, toggle);

  const content = createElement("div", "season-content");
  content.append(seasonTable(seasonRecords, season));
  details.append(summary, content);
  return details;
}

function renderSeasons() {
  const grouped = new Map();
  for (const record of records) {
    if (!grouped.has(record.season)) grouped.set(record.season, []);
    grouped.get(record.season).push(record);
  }

  const seasons = [...grouped.keys()].sort((left, right) => seasonStart(right) - seasonStart(left));
  seasonList.replaceChildren();
  seasons.forEach((season, index) => {
    seasonList.append(renderSeason(season, grouped.get(season), index));
  });
}

function showPerson(name) {
  const honors = records
    .filter((record) => record.members.includes(name))
    .sort((left, right) => seasonStart(right.season) - seasonStart(left.season));

  personName.textContent = name;
  personRecordsBody.replaceChildren();

  for (const honor of honors) {
    const row = document.createElement("tr");
    row.append(
      createElement("td", "", seasonLabel(honor.season)),
      createElement("td", "", honor.team),
      createElement("td", "", honor.contest),
    );
    const result = document.createElement("td");
    result.append(resultElement(honor));
    row.append(result);
    personRecordsBody.append(row);
  }

  personDialog.showModal();
}

function showContest(contest) {
  const honors = records
    .filter((record) => record.contest === contest)
    .sort(
      (left, right) =>
        seasonStart(right.season) - seasonStart(left.season) ||
        collator.compare(left.team, right.team),
    );

  contestName.textContent = contest;
  contestRecordsBody.replaceChildren();

  for (const honor of honors) {
    const row = document.createElement("tr");
    row.append(
      createElement("td", "", seasonLabel(honor.season)),
      createElement("td", "", honor.team),
    );
    const award = createElement("td");
    award.append(resultElement(honor));
    row.append(award);
    contestRecordsBody.append(row);
  }

  contestDialog.showModal();
}

document.addEventListener("click", (event) => {
  const contest = event.target.closest("[data-contest]");
  if (contest) {
    showContest(contest.dataset.contest);
    return;
  }

  const person = event.target.closest("[data-person]");
  if (person) showPerson(person.dataset.person);
});

menuToggle.addEventListener("click", () => setMenuOpen(!siteSidebar.classList.contains("is-open")));
menuClose.addEventListener("click", () => setMenuOpen(false));
sidebarBackdrop.addEventListener("click", () => setMenuOpen(false));
sidebarFolderToggle.addEventListener("click", () => {
  const expanded = sidebarFolderToggle.getAttribute("aria-expanded") === "true";
  sidebarFolderToggle.setAttribute("aria-expanded", String(!expanded));
  boardTree.hidden = expanded;
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && siteSidebar.classList.contains("is-open")) {
    setMenuOpen(false);
  }
});
window.addEventListener("hashchange", () => {
  renderPage();
  setMenuOpen(false);
});

for (const recordDialog of [personDialog, contestDialog]) {
  const shell = recordDialog.querySelector(".dialog-shell");
  const close = recordDialog.querySelector(".dialog-close");
  close.addEventListener("click", () => recordDialog.close());
  recordDialog.addEventListener("click", (event) => {
    if (event.target === recordDialog) recordDialog.close();
  });
  shell.addEventListener("click", (event) => event.stopPropagation());
}

function fetchJson(path) {
  return fetch(path).then((response) => {
    if (!response.ok) throw new Error(`无法读取数据（${response.status}）`);
    return response.json();
  });
}

Promise.all([
  fetchJson("data/awards.json"),
  fetchJson("data/wf.json"),
  fetchJson("data/first_blood.json"),
  fetchJson("data/boards.json"),
])
  .then(([awardData, wfData, firstBloodData, boardsData]) => {
    records = validateRecords(awardData);
    wfQualifications = validateWfQualifications(wfData);
    firstBloodIndex = indexFirstBlood(validateFirstBlood(firstBloodData));
    boardTreeData = validateBoards(boardsData);
    renderBoardMenu();
    renderSeasons();
    renderPage();
    loadingStatus.hidden = true;
  })
  .catch((error) => {
    loadingStatus.textContent = `${error.message}。请稍后重试。`;
    console.error(error);
  });
