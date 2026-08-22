const MEDAL_CLASS = {
  金: "medal-gold",
  银: "medal-silver",
  铜: "medal-bronze",
};

const MEDAL_ORDER = ["金", "银", "铜"];
const collator = new Intl.Collator("zh-CN", { numeric: true });

const seasonList = document.querySelector("#season-list");
const loadingStatus = document.querySelector("#loading-status");
const dialog = document.querySelector("#person-dialog");
const dialogShell = dialog.querySelector(".dialog-shell");
const dialogClose = dialog.querySelector(".dialog-close");
const personName = document.querySelector("#person-name");
const personRecordsBody = document.querySelector("#person-records-body");

let records = [];
let wfQualifications = [];

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

function resultElement(record) {
  const result = createElement("span", `result ${MEDAL_CLASS[record.award]}`);
  result.append(document.createTextNode(`${record.award}奖`));
  if (record.rank !== null) {
    result.append(createElement("span", "result-rank", ` · ${record.rank}`));
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
    const heading = createElement("th", "contest-heading", contest);
    heading.scope = "col";
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

  dialog.showModal();
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-person]");
  if (button) showPerson(button.dataset.person);
});

dialogClose.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
dialogShell.addEventListener("click", (event) => event.stopPropagation());

function fetchJson(path) {
  return fetch(path).then((response) => {
    if (!response.ok) throw new Error(`无法读取数据（${response.status}）`);
    return response.json();
  });
}

Promise.all([fetchJson("data/awards.json"), fetchJson("data/wf.json")])
  .then(([awardData, wfData]) => {
    records = validateRecords(awardData);
    wfQualifications = validateWfQualifications(wfData);
    renderSeasons();
    loadingStatus.hidden = true;
  })
  .catch((error) => {
    loadingStatus.textContent = `${error.message}。请稍后重试。`;
    console.error(error);
  });
