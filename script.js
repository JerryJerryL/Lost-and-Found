// ==============================
// 基础配置
// ==============================
const CHECKLIST_ITEMS = ["编号有效性", "来源可信度", "物主匹配度", "异常可控性", "处理合规性"];

const CHECK_STATE = {
  unchecked: { label: "未检查", symbol: "[ ]", className: "" },
  pass: { label: "通过", symbol: "[✓]", className: "pass" },
  suspect: { label: "可疑", symbol: "[?]", className: "suspect" },
  conflict: { label: "冲突", symbol: "[!]", className: "conflict" }
};

const INVESTIGATIONS = [
  { key: "id", label: "查编号", checklistIndex: 0 },
  { key: "source", label: "查来源", checklistIndex: 1 },
  { key: "owner", label: "查物主", checklistIndex: 2 },
  { key: "scan", label: "扫描异常", checklistIndex: 3 },
  { key: "read", label: "打开 / 读取", checklistIndex: 4 }
];

const DISPOSITIONS = {
  return: { label: "归还", className: "primary" },
  seal: { label: "封存", className: "warn" },
  destroy: { label: "销毁", className: "danger" },
  sell: { label: "出售", className: "" },
  deferred: { label: "遗留", className: "warn" }
};

const DEFAULT_PREVIEW_LOCKS = {
  funds: ["id"],
  pollution: ["scan"],
  trust: ["owner"]
};

const START_DAY = 3;
const DAILY_ACTION_POINTS = 15;
const SAVE_KEY = "station404_save";
const BACKGROUND_MUSIC_VOLUME = 0.3;

function getDefaultSave() {
  return {
    day: 3,
    funds: 18,
    pollution: 12,
    trust: 72,
    actionPoints: 15,

    usedItemIds: [],
    gameFlags: [],

    ownedDevices: {
      audio_resonator: false,
      memory_extractor: false,
      image_echo: false,
      melody_decoder: false
    },

    hasRadio: false,
    hasBlanket: false,

    pendingTrustBonus: 0,
    nextDayApBonus: 0,

    shopPurchasesToday: {},
    bedroomLogs: []
  };
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  const defaults = getDefaultSave();

  if (!raw) return defaults;

  try {
    const parsed = JSON.parse(raw);
    return {
      ...defaults,
      ...parsed,
      ownedDevices: {
        ...defaults.ownedDevices,
        ...(parsed.ownedDevices || {})
      },
      shopPurchasesToday: parsed.shopPurchasesToday || {},
      usedItemIds: parsed.usedItemIds || [],
      gameFlags: parsed.gameFlags || [],
      bedroomLogs: parsed.bedroomLogs || []
    };
  } catch (error) {
    console.warn("Save corrupted, using default save.", error);
    return defaults;
  }
}

function setupBackgroundMusic() {
  const audio = document.getElementById("backgroundMusic");
  if (!audio) return;

  audio.volume = BACKGROUND_MUSIC_VOLUME;

  document.addEventListener("click", () => {
    audio.play().catch((error) => {
      console.warn("Background music could not start.", error);
    });
  }, { once: true });
}

// ==============================
// 运行状态
// ==============================
let manifest = null;
let items = [];
let letters = [];
let currentFiles = [];

const state = {
  day: START_DAY,
  actionPoints: DAILY_ACTION_POINTS,
  funds: 18,
  pollution: 12,
  trust: 72,
  selectedFileKey: null,
  pendingDecision: null,
  report: null,
  demoEnded: false,
  usedItemIds: [],
  ownedDevices: {
    audio_resonator: false,
    memory_extractor: false,
    image_echo: false,
    melody_decoder: false
  },
  hasRadio: false,
  hasBlanket: false,
  pendingTrustBonus: 0,
  nextDayApBonus: 0,
  shopPurchasesToday: {},
  bedroomLogs: []
};

const itemState = {};
const letterState = {};
const logs = [];
const gameFlags = [];

const el = {
  dayValue: document.getElementById("dayValue"),
  apValue: document.getElementById("apValue"),
  fundsValue: document.getElementById("fundsValue"),
  pollutionValue: document.getElementById("pollutionValue"),
  trustValue: document.getElementById("trustValue"),
  fundsStat: document.getElementById("fundsStat"),
  pollutionStat: document.getElementById("pollutionStat"),
  trustStat: document.getElementById("trustStat"),
  itemList: document.getElementById("itemList"),
  remainingTag: document.getElementById("remainingTag"),
  processedTag: document.getElementById("processedTag"),
  itemIcon: document.getElementById("itemIcon"),
  itemName: document.getElementById("itemName"),
  itemCode: document.getElementById("itemCode"),
  itemSource: document.getElementById("itemSource"),
  itemOwner: document.getElementById("itemOwner"),
  itemAnomaly: document.getElementById("itemAnomaly"),
  itemStatus: document.getElementById("itemStatus"),
  itemDescription: document.getElementById("itemDescription"),
  investigationButtons: document.getElementById("investigationButtons"),
  resultList: document.getElementById("resultList"),
  checklist: document.getElementById("checklist"),
  actionButtons: document.getElementById("actionButtons"),
  logList: document.getElementById("logList"),
  logCount: document.getElementById("logCount"),
  confirmModal: document.getElementById("confirmModal"),
  confirmTitle: document.getElementById("confirmTitle"),
  confirmText: document.getElementById("confirmText"),
  deltaGrid: document.getElementById("deltaGrid"),
  confirmSummary: document.getElementById("confirmSummary"),
  cancelDecision: document.getElementById("cancelDecision"),
  confirmDecision: document.getElementById("confirmDecision")
};

const checklistPanel = el.checklist.closest(".panel");
const actionPanelTitle = document.querySelector(".right-stack .panel:last-child h2");

function applySaveToState(save) {
  state.day = save.day;
  state.funds = save.funds;
  state.pollution = save.pollution;
  state.trust = save.trust;
  state.actionPoints = save.actionPoints;
  state.usedItemIds = [...save.usedItemIds];
  state.ownedDevices = { ...save.ownedDevices };
  state.hasRadio = save.hasRadio;
  state.hasBlanket = save.hasBlanket;
  state.pendingTrustBonus = save.pendingTrustBonus;
  state.nextDayApBonus = save.nextDayApBonus;
  state.shopPurchasesToday = { ...save.shopPurchasesToday };
  state.bedroomLogs = [...save.bedroomLogs];
  gameFlags.splice(0, gameFlags.length, ...save.gameFlags);
}

function saveGame() {
  const save = {
    day: state.day,
    funds: state.funds,
    pollution: state.pollution,
    trust: state.trust,
    actionPoints: state.actionPoints,

    usedItemIds: [...state.usedItemIds],
    gameFlags: [...gameFlags],

    ownedDevices: { ...state.ownedDevices },

    hasRadio: state.hasRadio,
    hasBlanket: state.hasBlanket,

    pendingTrustBonus: state.pendingTrustBonus,
    nextDayApBonus: state.nextDayApBonus,

    shopPurchasesToday: { ...state.shopPurchasesToday },
    bedroomLogs: [...state.bedroomLogs]
  };

  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

function resetSave() {
  applySaveToState(getDefaultSave());
  saveGame();
}

// ==============================
// 数据加载
// ==============================
async function loadJSON(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`无法读取 ${path}`);
  }

  return response.json();
}

async function loadManifest() {
  manifest = await loadJSON("data/manifest.json");
}

function pickRandomUnique(array, count) {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function markItemUsed(itemId) {
  if (!state.usedItemIds.includes(itemId)) {
    state.usedItemIds.push(itemId);
  }
}

async function loadDay(day) {
  if (!manifest) {
    await loadManifest();
  }

  const dayConfig = manifest.demoDays?.[String(day)];

  if (!dayConfig) {
    return false;
  }

  const poolIds = manifest.commonPools?.[dayConfig.commonPool] || [];
  const availableCommonIds = poolIds.filter((id) => !state.usedItemIds.includes(id));
  const commonTargetCount = dayConfig.commonCount || availableCommonIds.length;
  const commonIds = pickRandomUnique(availableCommonIds, commonTargetCount);
  const fixedLetterIds = dayConfig.letters || [];
  const conditionalLetterIds = (manifest.conditionalLetters || [])
    .filter((entry) => entry.day === day && entry.requires.every((flag) => gameFlags.includes(flag)))
    .map((entry) => entry.id);
  const uniqueLetterIds = [...new Set([...fixedLetterIds, ...conditionalLetterIds])];

  const loadedLetters = await Promise.all(uniqueLetterIds.map((id) => loadJSON(`data/letters/${id}.json`)));
  const storyItems = [];
  if (dayConfig.storyItem) {
    if (state.usedItemIds.includes(dayConfig.storyItem)) {
      addLog(`剧情失物已归档，今日跳过重复派发：${dayConfig.storyItem}`);
    } else {
      storyItems.push(await loadJSON(`data/story_items/${dayConfig.storyItem}.json`));
    }
  }

  if (availableCommonIds.length < commonTargetCount) {
    addLog(`普通失物库存不足，今日仅派发 ${availableCommonIds.length} 件普通失物。`);
  }

  const commonItems = await Promise.all(commonIds.map((id) => loadJSON(`data/common_items/${id}.json`)));

  letters = loadedLetters.map((letter) => ({ ...letter, type: "letter" }));
  items = [...storyItems, ...commonItems].map((item) => ({ ...item, type: "item" }));
  currentFiles = [...letters, ...items];

  initializeDayState();
  return true;
}

function initializeDayState() {
  Object.keys(itemState).forEach((key) => delete itemState[key]);
  Object.keys(letterState).forEach((key) => delete letterState[key]);

  items.forEach((item) => {
    itemState[item.id] = {
      checklist: CHECKLIST_ITEMS.map(() => "unchecked"),
      investigated: {},
      results: [],
      processed: false,
      disposition: null
    };
  });

  letters.forEach((letter) => {
    const wasRead = gameFlags.includes(letterReadFlag(letter.id))
      || (letter.flagsAdded || []).some((flag) => gameFlags.includes(flag));
    letterState[letter.id] = { read: wasRead, effectsApplied: wasRead };
  });

  const firstUnreadLetter = letters.find((letter) => !letterState[letter.id].read);
  const firstFile = firstUnreadLetter || items[0] || currentFiles[0] || null;
  state.selectedFileKey = firstFile ? fileKey(firstFile) : null;
}

// ==============================
// 工具函数
// ==============================
function fileKey(file) {
  return `${file.type}:${file.id}`;
}

function letterReadFlag(letterId) {
  return `letter_read_${letterId}`;
}

function getSelectedFile() {
  return currentFiles.find((file) => fileKey(file) === state.selectedFileKey) || null;
}

function getSelectedItem() {
  const file = getSelectedFile();
  return file?.type === "item" ? file : null;
}

function getEffects(source) {
  return {
    funds: source?.effects?.funds || 0,
    pollution: source?.effects?.pollution || 0,
    trust: source?.effects?.trust || 0
  };
}

// previewLocks 设计原则：
// - 想归还的风险通常由 owner / source 解锁
// - 想出售的收益通常由 id / scan 解锁
// - 想封存的风险通常由 scan / source 解锁
// - 想销毁的代价通常由 scan / read / id 解锁
// - 但每件物品可以根据剧情逻辑自定义
function getPreviewLocks(item, actionKey) {
  const disposition = item.dispositions[actionKey];

  return {
    funds: disposition.previewLocks?.funds || DEFAULT_PREVIEW_LOCKS.funds,
    pollution: disposition.previewLocks?.pollution || DEFAULT_PREVIEW_LOCKS.pollution,
    trust: disposition.previewLocks?.trust || DEFAULT_PREVIEW_LOCKS.trust
  };
}

function isPreviewUnlocked(local, requiredKeys) {
  if (!requiredKeys || requiredKeys.length === 0) return true;
  return requiredKeys.every((key) => local.investigated[key]);
}

function formatPreviewValue(value, unlocked) {
  return unlocked ? formatDelta(value) : "███";
}

function applyEffects(effects) {
  state.funds += effects.funds;
  state.pollution += effects.pollution;
  state.trust += effects.trust;
}

function collectFlags(flags = []) {
  flags.forEach((flag) => {
    if (!gameFlags.includes(flag)) {
      gameFlags.push(flag);
    }
  });
}

function formatDelta(value) {
  return value > 0 ? `+${value}` : String(value);
}

function effectsSummary(effects) {
  const parts = [];

  if (effects.funds) parts.push(`资金 ${formatDelta(effects.funds)}`);
  if (effects.pollution) parts.push(`污染 ${formatDelta(effects.pollution)}`);
  if (effects.trust) parts.push(`信任 ${formatDelta(effects.trust)}`);

  return parts.length ? `。${parts.join("，")}。` : "。";
}

function addLog(text) {
  const stamp = new Date().toLocaleTimeString("zh-CN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  logs.unshift({ stamp, text });
  renderLog();
}

function checklistSummary(local) {
  return CHECKLIST_ITEMS.map((name, index) => {
    const data = CHECK_STATE[local.checklist[index]];
    return `${data.symbol} ${name}：${data.label}`;
  }).join("<br>");
}

// ==============================
// 渲染
// ==============================
function renderAll() {
  renderStatus();
  renderFileList();
  renderMainPanel();
  renderRightPanel();
  renderResults();
}

function renderStatus() {
  el.dayValue.textContent = state.day;
  el.apValue.textContent = state.actionPoints;
  el.fundsValue.textContent = state.funds;
  el.pollutionValue.textContent = state.pollution;
  el.trustValue.textContent = state.trust;

  el.fundsStat.classList.toggle("warning", state.funds < 10);
  el.pollutionStat.classList.toggle("danger", state.pollution >= 25);
  el.trustStat.classList.toggle("warning", state.trust < 60);
}

function renderFileList() {
  const remaining = items.filter((item) => !itemState[item.id].processed).length;
  const unread = letters.filter((letter) => !letterState[letter.id].read).length;
  el.remainingTag.textContent = `${remaining} 件待处理 / ${unread} 封未读`;

  if (!currentFiles.length) {
    el.itemList.innerHTML = "";
    return;
  }

  el.itemList.innerHTML = currentFiles.map((file) => {
    const active = fileKey(file) === state.selectedFileKey ? "active" : "";
    return file.type === "letter" ? renderLetterCard(file, active) : renderItemCard(file, active);
  }).join("");

  document.querySelectorAll(".item-card").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedFileKey = button.dataset.fileKey;
      renderAll();
    });
  });
}

function renderItemCard(item, active) {
  const local = itemState[item.id];
  const processed = local.processed ? "processed" : "";
  const status = local.processed ? `已${DISPOSITIONS[local.disposition].label}` : "待审";

  return `
    <button class="item-card ${active} ${processed}" data-file-key="${fileKey(item)}">
      <div class="item-row">
        <div class="item-icon">${item.icon}</div>
        <div class="item-name">
          <strong>${item.name}</strong>
          <span>${item.code}</span>
        </div>
      </div>
      <div class="item-meta">
        <span>${status}</span>
        <span>${Object.keys(local.investigated).length}/5 已查</span>
      </div>
    </button>
  `;
}

function renderLetterCard(letter, active) {
  const local = letterState[letter.id];
  const readClass = local.read ? "processed" : "";
  const priority = letter.priority === "urgent" ? "紧急" : letter.priority === "warning" ? "警告" : "普通";

  return `
    <button class="item-card letter-card ${active} ${readClass}" data-file-key="${fileKey(letter)}">
      <div class="item-row">
        <div class="item-icon">✉</div>
        <div class="item-name">
          <strong>${letter.title}</strong>
          <span>${letter.sender.name}</span>
        </div>
      </div>
      <div class="item-meta">
        <span>${local.read ? "已读" : "未读"}</span>
        <span>${priority}</span>
      </div>
    </button>
  `;
}

function renderMainPanel() {
  const file = getSelectedFile();

  if (!file) {
    renderEmptyMainPanel();
    return;
  }

  if (file.type === "letter") {
    renderLetterPanel(file);
    return;
  }

  renderItemPanel(file);
}

function renderEmptyMainPanel() {
  el.processedTag.textContent = "无文件";
  el.itemIcon.textContent = "?";
  el.itemName.textContent = "等待文件";
  el.itemCode.textContent = "编号：--";
  el.itemSource.textContent = "--";
  el.itemOwner.textContent = "--";
  el.itemAnomaly.textContent = "--";
  el.itemStatus.textContent = "--";
  el.itemDescription.textContent = "";
  el.investigationButtons.innerHTML = "";
}

function renderItemPanel(item) {
  const local = itemState[item.id];
  el.processedTag.textContent = local.processed ? `已${DISPOSITIONS[local.disposition].label}` : "未处理";
  el.itemIcon.textContent = item.icon;
  el.itemName.textContent = item.name;
  el.itemCode.textContent = `编号：${item.code}`;
  el.itemSource.textContent = item.dossier.source;
  el.itemOwner.textContent = item.dossier.owner;
  el.itemAnomaly.textContent = item.dossier.anomaly;
  el.itemStatus.textContent = local.processed ? "归档完成，禁止再操作" : "试用期人工审查中";
  el.itemDescription.textContent = item.dossier.description;

  el.investigationButtons.innerHTML = INVESTIGATIONS.map((investigation) => {
    const investigated = local.investigated[investigation.key];
    const disabled = local.processed || investigated || state.actionPoints <= 0;
    const label = investigated ? `${investigation.label} ✓` : investigation.label;
    return `<button class="btn" data-investigation="${investigation.key}" ${disabled ? "disabled" : ""}>${label}</button>`;
  }).join("");

  document.querySelectorAll("[data-investigation]").forEach((button) => {
    button.addEventListener("click", () => investigate(button.dataset.investigation));
  });
}

function renderLetterPanel(letter) {
  const local = letterState[letter.id];
  const portrait = letter.sender.portrait
    ? `<img src="${letter.sender.portrait}" alt="">`
    : `<span>✉</span>`;

  el.processedTag.textContent = local.read ? "已读" : "未读";
  el.itemIcon.innerHTML = portrait;
  el.itemName.textContent = letter.title;
  el.itemCode.textContent = `来信者：${letter.sender.name}`;
  el.itemSource.textContent = letter.sender.name;
  el.itemOwner.textContent = letter.sender.role;
  el.itemAnomaly.textContent = letter.priority === "urgent" ? "紧急" : letter.priority === "warning" ? "警告" : "普通";
  el.itemStatus.textContent = local.read ? "已归档" : "等待阅读";
  el.itemDescription.innerHTML = letter.body.map((paragraph) => `<p>${paragraph}</p>`).join("");
  el.investigationButtons.innerHTML = "";
}

function renderRightPanel() {
  const file = getSelectedFile();

  if (file?.type === "letter") {
    checklistPanel.classList.add("hidden");
    actionPanelTitle.textContent = "信件操作";
    renderLetterActions(file);
    return;
  }

  checklistPanel.classList.remove("hidden");
  actionPanelTitle.textContent = "处理决定";
  renderChecklist();
  renderActionButtons();
}

function renderChecklist() {
  const item = getSelectedItem();

  if (!item) {
    el.checklist.innerHTML = "";
    return;
  }

  const local = itemState[item.id];
  el.checklist.innerHTML = CHECKLIST_ITEMS.map((name, index) => {
    const data = CHECK_STATE[local.checklist[index]];

    return `
      <div class="check-row">
        <span class="check-symbol ${data.className}">${data.symbol}</span>
        <span class="check-name">${name}</span>
        <span class="check-state">${data.label}</span>
      </div>
    `;
  }).join("");
}

function renderActionButtons() {
  const item = getSelectedItem();
  const local = item ? itemState[item.id] : null;
  const itemActionKeys = Object.keys(DISPOSITIONS).filter((key) => key !== "deferred");
  const submitDisabled = state.report ? "disabled" : "";

  const itemActionButtons = itemActionKeys.map((key) => {
    const action = DISPOSITIONS[key];
    const disabled = !local || local.processed ? "disabled" : "";
    return `<button class="btn ${action.className}" data-action="${key}" ${disabled}>${action.label}</button>`;
  }).join("");

  el.actionButtons.innerHTML = `
    ${itemActionButtons}
    <button class="btn submit-review" data-submit-review ${submitDisabled}>提交今日审查</button>
  `;

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => openConfirm(button.dataset.action));
  });

  document.querySelector("[data-submit-review]").addEventListener("click", openSubmitConfirm);
}

function renderLetterActions(letter) {
  const local = letterState[letter.id];
  const disabled = local.read && letter.readOnce ? "disabled" : "";

  el.actionButtons.innerHTML = `
    <button class="btn primary mark-read" data-mark-letter-read ${disabled}>标记为已读</button>
  `;

  document.querySelector("[data-mark-letter-read]")?.addEventListener("click", () => markLetterRead(letter.id));
}

function renderResults() {
  const file = getSelectedFile();
  const entries = [];
  const hasUnprocessedItems = items.some((entry) => !itemState[entry.id].processed);

  if (state.report) {
    entries.push(renderReport());
  }

  if (state.demoEnded) {
    entries.push(`
      <div class="result-entry ap-warning">
        <b>DEMO END</b>
        <p>Demo 已结束。后续档案等待解锁。</p>
      </div>
    `);
  }

  if (state.actionPoints <= 0 && hasUnprocessedItems) {
    entries.push(`
      <div class="result-entry ap-warning">
        <b>ACTION POINTS DEPLETED</b>
        <p>行动点已用尽。你仍可根据现有信息直接处理失物，或提交今日审查。</p>
      </div>
    `);
  }

  if (file?.type === "item") {
    const local = itemState[file.id];
    if (local.results.length === 0) {
      entries.push(`
        <div class="result-entry">
          <b>NO QUERY</b>
          <p>尚未执行调查。请选择调查按钮更新审查清单。</p>
        </div>
      `);
    } else {
      entries.push(...local.results.map((result) => `
        <div class="result-entry">
          <b>${result.label}</b>
          <p>${result.text}</p>
        </div>
      `));
    }
  } else if (file?.type === "letter") {
    entries.push(`
      <div class="result-entry">
        <b>LETTER</b>
        <p>信件不需要 checklist。阅读后可标记为已读，并归档其附带影响。</p>
      </div>
    `);
  }

  el.resultList.innerHTML = entries.join("");
  document.querySelector("[data-go-bedroom]")?.addEventListener("click", goToBedroom);
}

function renderReport() {
  return `
    <div class="report" id="todayReport">
      <header>
        <h3>今日审查报告：${state.report.title}</h3>
      </header>
      <div class="report-body">
        <p>${state.report.text}</p>
        <div class="report-stats">
          <span class="tag">Funds ${state.funds}</span>
          <span class="tag">Pollution ${state.pollution}</span>
          <span class="tag">Trust ${state.trust}</span>
        </div>
        <p>新增失物：1件。分类：人员。状态：等待人工复核。</p>
        <button class="btn next-day" data-go-bedroom ${state.demoEnded ? "disabled" : ""}>下班回休息室</button>
      </div>
    </div>
  `;
}

function renderLog() {
  el.logCount.textContent = `${logs.length} 条`;
  el.logList.innerHTML = logs.map((entry) => `<li><time>${entry.stamp}</time>${entry.text}</li>`).join("");
}

// ==============================
// 交互逻辑
// ==============================
function investigate(key) {
  const item = getSelectedItem();

  if (!item) return;

  const local = itemState[item.id];
  const rule = INVESTIGATIONS.find((entry) => entry.key === key);
  const result = item.investigations[key];

  if (local.processed) {
    addLog(`${item.code} 已处理，调查权限被系统锁定。`);
    return;
  }

  if (local.investigated[key]) {
    addLog(`${rule.label} 已完成，重复查询被忽略。`);
    return;
  }

  if (state.actionPoints <= 0) {
    addLog("行动点不足。");
    renderAll();
    return;
  }

  const effects = getEffects(result);
  state.actionPoints -= 1;
  applyEffects(effects);
  collectFlags(result.flags);
  local.investigated[key] = true;
  local.checklist[rule.checklistIndex] = result.checklistState;
  local.results.unshift({ label: rule.label, text: result.text });

  addLog(`${item.code} ${rule.label} 完成${effectsSummary(effects)}`);
  saveGame();
  renderAll();
}

function openConfirm(actionKey) {
  const item = getSelectedItem();

  if (!item) return;

  const local = itemState[item.id];
  const action = DISPOSITIONS[actionKey];
  const delta = item.dispositions[actionKey];
  const effects = getEffects(delta);
  const locks = getPreviewLocks(item, actionKey);

  if (local.processed) {
    addLog(`${item.code} 已处理，不能重复执行决定。`);
    return;
  }

  const unlocked = {
    funds: isPreviewUnlocked(local, locks.funds),
    pollution: isPreviewUnlocked(local, locks.pollution),
    trust: isPreviewUnlocked(local, locks.trust)
  };
  const completeness = Object.values(unlocked).filter(Boolean).length;

  state.pendingDecision = { type: "itemDisposition", itemId: item.id, actionKey };
  el.confirmTitle.textContent = `确认${action.label}：${item.name}`;
  el.confirmText.innerHTML = `<p>预计执行 <strong>${action.label}</strong>，请核对数值变化与 checklist 摘要。</p>`;
  el.deltaGrid.innerHTML = `
    <div class="delta"><span>Funds</span><strong>${formatPreviewValue(effects.funds, unlocked.funds)}</strong></div>
    <div class="delta"><span>Pollution</span><strong>${formatPreviewValue(effects.pollution, unlocked.pollution)}</strong></div>
    <div class="delta"><span>Trust</span><strong>${formatPreviewValue(effects.trust, unlocked.trust)}</strong></div>
  `;
  el.confirmSummary.innerHTML = `
    预估完整度：${completeness}/3<br>
    ${checklistSummary(local)}
  `;
  el.confirmModal.classList.add("open");
}

function openSubmitConfirm() {
  if (state.report) return;

  const deferredCount = items.filter((item) => !itemState[item.id].processed).length;
  const trustPenalty = deferredCount * 5;
  const pollutionPenalty = deferredCount * 2;

  state.pendingDecision = { type: "submitReview", deferredCount, trustPenalty, pollutionPenalty };
  el.confirmTitle.textContent = "确认提交今日审查";
  el.confirmText.innerHTML = deferredCount > 0
    ? `<p>仍有 <strong>${deferredCount}</strong> 件失物未处理。提交审查会将它们标记为遗留未处理，并造成信任下降和污染上升。</p>`
    : "<p>所有失物均已处理。提交后将生成今日审查报告。</p>";
  el.deltaGrid.innerHTML = `
    <div class="delta"><span>Funds</span><strong>0</strong></div>
    <div class="delta"><span>Pollution</span><strong>${formatDelta(pollutionPenalty)}</strong></div>
    <div class="delta"><span>Trust</span><strong>${formatDelta(-trustPenalty)}</strong></div>
  `;
  el.confirmSummary.innerHTML = `
    遗留未处理：${deferredCount} 件<br>
    信任变化：${formatDelta(-trustPenalty)}<br>
    污染变化：${formatDelta(pollutionPenalty)}
  `;
  el.confirmModal.classList.add("open");
}

function closeConfirm() {
  state.pendingDecision = null;
  el.confirmModal.classList.remove("open");
}

function executeDecision() {
  if (!state.pendingDecision) return;

  if (state.pendingDecision.type === "submitReview") {
    submitReview();
    return;
  }

  const item = items.find((entry) => entry.id === state.pendingDecision.itemId);
  const local = itemState[item.id];
  const actionKey = state.pendingDecision.actionKey;
  const delta = item.dispositions[actionKey];
  const effects = getEffects(delta);

  applyEffects(effects);
  collectFlags(delta.flags);

  if (state.pendingTrustBonus > 0) {
    const trustBonus = state.pendingTrustBonus;
    state.trust += trustBonus;
    state.pendingTrustBonus = 0;
    addLog(`合规盖章器生效。信任 +${trustBonus}。`);
  }

  local.processed = true;
  local.disposition = actionKey;
  markItemUsed(item.id);

  addLog(delta.log);
  closeConfirm();
  maybeCreateReport();
  saveGame();
  renderAll();
}

function submitReview() {
  const deferredCount = items.filter((item) => !itemState[item.id].processed).length;

  items.forEach((item) => {
    const local = itemState[item.id];

    if (!local.processed) {
      local.processed = true;
      local.disposition = "deferred";
      markItemUsed(item.id);
    }
  });

  state.trust -= deferredCount * 5;
  state.pollution += deferredCount * 2;

  addLog(`今日审查已提交。${deferredCount} 件失物被标记为遗留未处理。`);
  closeConfirm();
  maybeCreateReport();
  saveGame();
  renderAll();
}

function markLetterRead(letterId) {
  const letter = letters.find((entry) => entry.id === letterId);
  const local = letterState[letterId];

  if (!letter || !local) return;

  if (local.read && letter.readOnce) {
    return;
  }

  if (!local.effectsApplied || !letter.readOnce) {
    applyEffects(getEffects(letter));
    collectFlags([...(letter.flagsAdded || []), letterReadFlag(letter.id)]);
    local.effectsApplied = true;
  }

  local.read = true;
  addLog(`已读取信件：${letter.title}`);
  saveGame();
  renderAll();
}

function maybeCreateReport() {
  const completed = items.every((item) => itemState[item.id].processed);

  if (!completed || state.report) return;

  state.report = getReport();
  addLog("今日审查报告已生成。新增失物：1件。分类：人员。状态：等待人工复核。");
}

function getReport() {
  if (state.pollution >= 25) {
    return {
      title: "异常风险",
      text: "第404号站点出现多处低级现实错位。建议安排夜间复核。"
    };
  }

  if (state.funds < 10) {
    return {
      title: "财务风险",
      text: "本站运营资金不足。公司建议提高回收收益。"
    };
  }

  if (state.trust < 60) {
    return {
      title: "监管关注",
      text: "处理流程存在多项违规风险。监管机构已标记本站。"
    };
  }

  return {
    title: "试用期记录正常",
    text: "今日处理流程未触发严重事故。系统将在夜间继续观察。"
  };
}

async function enterNextDay() {
  if (!state.report || state.demoEnded) return;

  const nextDay = state.day + 1;
  const hasNextDay = manifest?.demoDays?.[String(nextDay)];

  if (!hasNextDay) {
    state.demoEnded = true;
    addLog("Demo 已结束。后续档案等待解锁。");
    renderAll();
    return;
  }

  state.day = nextDay;
  state.actionPoints = DAILY_ACTION_POINTS;
  state.report = null;
  state.pendingDecision = null;
  state.demoEnded = false;

  await loadDay(state.day);
  addLog(`第 ${state.day} 日文件已送达。`);
  renderAll();
}

function goToBedroom() {
  saveGame();
  window.location.href = "bedroom.html";
}

// ==============================
// 启动
// ==============================
async function startGame() {
  applySaveToState(loadGame());
  renderStatus();

  try {
    await loadManifest();
    const hasDay = await loadDay(state.day);

    if (!hasDay) {
      state.demoEnded = true;
      addLog("Demo 已结束。后续档案等待解锁。");
      renderAll();
      return;
    }

    addLog(`第404号宇宙失物招领处试用期终端已启动。第 ${state.day} 日文件已送达。`);
    renderAll();
  } catch (error) {
    addLog(`数据载入失败：${error.message}`);
    el.resultList.innerHTML = `
      <div class="result-entry ap-warning">
        <b>DATA LOAD FAILED</b>
        <p>无法读取文件数据。请通过本地服务器打开页面，以允许浏览器读取 data 目录中的 JSON 文件。</p>
      </div>
    `;
  }
}

el.cancelDecision.addEventListener("click", closeConfirm);
el.confirmDecision.addEventListener("click", executeDecision);
el.confirmModal.addEventListener("click", (event) => {
  if (event.target === el.confirmModal) {
    closeConfirm();
  }
});

setupBackgroundMusic();
startGame();
