const DAILY_ACTION_POINTS = 15;
const SAVE_KEY = "station404_save";
const BACKGROUND_MUSIC_VOLUME = 0.35;

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

let state = loadGame();

function saveGame() {
  const save = {
    day: state.day,
    funds: state.funds,
    pollution: state.pollution,
    trust: state.trust,
    actionPoints: state.actionPoints,

    usedItemIds: [...state.usedItemIds],
    gameFlags: [...state.gameFlags],

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
  state = getDefaultSave();
  saveGame();
}

const DEVICE_LABELS = {
  audio_resonator: "音频共振器",
  memory_extractor: "记忆提取器",
  image_echo: "图像回声器",
  melody_decoder: "旋律解码器"
};

const SHOP_ITEMS = [
  {
    id: "meal_pack",
    name: "方便食品包",
    kind: "消耗品",
    cost: 3,
    limit: 2,
    effectText: "行动点 +2",
    apply() {
      state.actionPoints += 2;
    }
  },
  {
    id: "cleaner",
    name: "清洁剂",
    kind: "消耗品",
    cost: 4,
    limit: 2,
    effectText: "污染 -4",
    apply() {
      state.pollution = Math.max(0, state.pollution - 4);
    }
  },
  {
    id: "compliance_stamper",
    name: "合规盖章器",
    kind: "消耗品",
    cost: 5,
    limit: 1,
    effectText: "下次处理决定信任 +1",
    apply() {
      state.pendingTrustBonus += 1;
    }
  },
  {
    id: "audio_resonator",
    name: "音频共振器",
    kind: "永久读取器",
    cost: 8,
    effectText: "永久拥有",
    isOwned() {
      return state.ownedDevices.audio_resonator;
    },
    apply() {
      state.ownedDevices.audio_resonator = true;
    }
  },
  {
    id: "memory_extractor",
    name: "记忆提取器",
    kind: "永久读取器",
    cost: 9,
    effectText: "永久拥有",
    isOwned() {
      return state.ownedDevices.memory_extractor;
    },
    apply() {
      state.ownedDevices.memory_extractor = true;
    }
  },
  {
    id: "image_echo",
    name: "图像回声器",
    kind: "永久读取器",
    cost: 9,
    effectText: "永久拥有",
    isOwned() {
      return state.ownedDevices.image_echo;
    },
    apply() {
      state.ownedDevices.image_echo = true;
    }
  },
  {
    id: "melody_decoder",
    name: "旋律解码器",
    kind: "永久读取器",
    cost: 10,
    effectText: "永久拥有",
    isOwned() {
      return state.ownedDevices.melody_decoder;
    },
    apply() {
      state.ownedDevices.melody_decoder = true;
    }
  },
  {
    id: "radio",
    name: "收音机",
    kind: "休息室用品",
    cost: 6,
    effectText: "永久拥有",
    isOwned() {
      return state.hasRadio;
    },
    apply() {
      state.hasRadio = true;
    }
  },
  {
    id: "blanket",
    name: "小被被",
    kind: "休息室用品",
    cost: 7,
    effectText: "永久拥有，明日 AP +1",
    isOwned() {
      return state.hasBlanket;
    },
    apply() {
      state.hasBlanket = true;
      state.nextDayApBonus += 1;
    }
  }
];

const el = {
  dayValue: document.getElementById("dayValue"),
  apValue: document.getElementById("apValue"),
  fundsValue: document.getElementById("fundsValue"),
  pollutionValue: document.getElementById("pollutionValue"),
  trustValue: document.getElementById("trustValue"),
  fundsStat: document.getElementById("fundsStat"),
  pollutionStat: document.getElementById("pollutionStat"),
  trustStat: document.getElementById("trustStat"),
  bonusTag: document.getElementById("bonusTag"),
  radioValue: document.getElementById("radioValue"),
  blanketValue: document.getElementById("blanketValue"),
  pendingTrustValue: document.getElementById("pendingTrustValue"),
  purchaseCountValue: document.getElementById("purchaseCountValue"),
  deviceList: document.getElementById("deviceList"),
  shopGrid: document.getElementById("shopGrid"),
  bedroomLogCount: document.getElementById("bedroomLogCount"),
  bedroomLogList: document.getElementById("bedroomLogList"),
  finishRestButton: document.getElementById("finishRestButton"),
  clearSaveButton: document.getElementById("clearSaveButton")
};

function formatFunds(cost) {
  return `资金 -${cost}`;
}

function getPurchaseCount(itemId) {
  return state.shopPurchasesToday[itemId] || 0;
}

function canBuy(item) {
  if (item.isOwned?.()) return false;
  if (state.funds < item.cost) return false;
  if (item.limit && getPurchaseCount(item.id) >= item.limit) return false;
  return true;
}

function addBedroomLog(text) {
  const stamp = new Date().toLocaleTimeString("zh-CN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  state.bedroomLogs.unshift({ stamp, text });
  state.bedroomLogs = state.bedroomLogs.slice(0, 40);
  saveGame();
}

function buyItem(itemId) {
  const item = SHOP_ITEMS.find((entry) => entry.id === itemId);

  if (!item || !canBuy(item)) return;

  state.funds -= item.cost;
  item.apply();
  state.shopPurchasesToday[item.id] = getPurchaseCount(item.id) + 1;
  addBedroomLog(`购买成功：${item.name}。${formatFunds(item.cost)}，${item.effectText}。`);
  renderAll();
}

function finishRest() {
  const nextDay = state.day + 1;
  const apBonus = state.nextDayApBonus;

  state.day = nextDay;
  state.actionPoints = DAILY_ACTION_POINTS + apBonus;
  state.nextDayApBonus = 0;
  state.shopPurchasesToday = {};
  addBedroomLog(`休息结束。进入第 ${state.day} 日，行动点恢复为 ${state.actionPoints}。`);
  saveGame();
  window.location.href = "index.html";
}

function resetSaveAndRestart() {
  if (confirm("确定清除存档并重新开始？")) {
    localStorage.removeItem(SAVE_KEY);
    window.location.href = "index.html";
  }
}

function renderStatus() {
  el.dayValue.textContent = state.day;
  el.apValue.textContent = state.actionPoints;
  el.fundsValue.textContent = state.funds;
  el.pollutionValue.textContent = state.pollution;
  el.trustValue.textContent = state.trust;
  el.bonusTag.textContent = `明日 AP +${state.nextDayApBonus}`;

  el.fundsStat.classList.toggle("warning", state.funds < 10);
  el.pollutionStat.classList.toggle("danger", state.pollution >= 25);
  el.trustStat.classList.toggle("warning", state.trust < 60);
}

function renderRoom() {
  const purchaseCount = Object.values(state.shopPurchasesToday).reduce((sum, count) => sum + count, 0);
  el.radioValue.textContent = state.hasRadio ? "已拥有" : "未拥有";
  el.blanketValue.textContent = state.hasBlanket ? "已拥有" : "未拥有";
  el.pendingTrustValue.textContent = `待生效 +${state.pendingTrustBonus}`;
  el.purchaseCountValue.textContent = `${purchaseCount} 次`;

  el.deviceList.innerHTML = Object.entries(DEVICE_LABELS).map(([key, label]) => {
    const owned = state.ownedDevices[key];
    return `
      <div class="device-row ${owned ? "owned" : ""}">
        <span>${label}</span>
        <strong>${owned ? "已拥有" : "未拥有"}</strong>
      </div>
    `;
  }).join("");
}

function renderShop() {
  el.shopGrid.innerHTML = SHOP_ITEMS.map((item) => {
    const owned = item.isOwned?.() || false;
    const count = getPurchaseCount(item.id);
    const limitText = item.limit ? `${count}/${item.limit}` : owned ? "已拥有" : "0/1";
    const disabled = canBuy(item) ? "" : "disabled";
    const buttonText = owned ? "已拥有" : state.funds < item.cost ? "资金不足" : item.limit && count >= item.limit ? "今日售罄" : "购买";

    return `
      <article class="shop-item ${owned ? "owned" : ""}">
        <div>
          <small>${item.kind}</small>
          <h3>${item.name}</h3>
          <p>${item.effectText}</p>
        </div>
        <div class="shop-item-footer">
          <span class="tag">${formatFunds(item.cost)}</span>
          <span class="tag">${limitText}</span>
          <button class="btn primary" data-buy="${item.id}" ${disabled}>${buttonText}</button>
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll("[data-buy]").forEach((button) => {
    button.addEventListener("click", () => buyItem(button.dataset.buy));
  });
}

function renderBedroomLog() {
  el.bedroomLogCount.textContent = `${state.bedroomLogs.length} 条`;
  el.bedroomLogList.innerHTML = state.bedroomLogs.map((entry) => (
    `<li><time>${entry.stamp}</time>${entry.text}</li>`
  )).join("");
}

function renderAll() {
  renderStatus();
  renderRoom();
  renderShop();
  renderBedroomLog();
}

function startBedroom() {
  state = loadGame();
  renderAll();
}

el.finishRestButton.addEventListener("click", finishRest);
el.clearSaveButton.addEventListener("click", resetSaveAndRestart);

setupBackgroundMusic();
startBedroom();
