// 🖤 SYSTEMS
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'conclave_data.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const CONFIG = {
    PREFIX: ":",
    NAME: "Hodekai",
    VERSION: "5.0.0",
    OWNERS: { FATHER: "263787876771", CO_CREATOR: "263717306869" },
    MODS: ["2348123885002", "2349168527304", "256795955270", "2347031331295"],
    COMPANY_TAX: 0.15,
    USER_TAX: 0.05,
    LOAN_INTEREST: 0.001,
    BANKRUPTCY: 500000,
    COMPANY_MIN: 10000,
    PAIRING_EXPIRY: 180000,
    RESPONSE_DELAY: 5000,
    TAGALL_COOLDOWN: 300000,
    CHEQUE_EXPIRY: 172800000
};
CONFIG.DM_WHITELIST = [CONFIG.OWNERS.FATHER, CONFIG.OWNERS.CO_CREATOR, ...CONFIG.MODS];

const state = {
    USERS: {}, BANK: {}, COMPANIES: {}, LOANS: {}, CHEQUES: {},
    COOLDOWNS: {}, BLACKLIST: [], LOCKED_GROUPS: [],
    COUNCIL_GROUP: null, GOVERNMENT_FUNDS: 10000000,
    BOT_ACTIVE: true, GROUP_MESSAGES: {}, GROUP_LAST_ACTIVE: {},
    CONVO_MEMORY: {}, PENDING_HIRES: {}
};

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const d = JSON.parse(fs.readFileSync(DATA_FILE));
            state.USERS = d.USERS || {};
            state.BANK = d.BANK || {};
            state.COMPANIES = d.COMPANIES || {};
            state.LOANS = d.LOANS || {};
            state.CHEQUES = d.CHEQUES || {};
            state.BLACKLIST = d.BLACKLIST || [];
            state.LOCKED_GROUPS = d.LOCKED_GROUPS || [];
            state.COUNCIL_GROUP = d.COUNCIL_GROUP || null;
            state.GOVERNMENT_FUNDS = d.GOVERNMENT_FUNDS || 10000000;
            state.GROUP_MESSAGES = d.GROUP_MESSAGES || {};
            state.GROUP_LAST_ACTIVE = d.GROUP_LAST_ACTIVE || {};
            state.PENDING_HIRES = d.PENDING_HIRES || {};
            if (d.MODS) CONFIG.MODS = d.MODS;
            if (d.DM_WHITELIST) CONFIG.DM_WHITELIST = d.DM_WHITELIST;
            console.log('📂 Loaded:', Object.keys(state.USERS).length, 'users');
        }
    } catch (e) { console.error('Load:', e.message); }
}

function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify({
            USERS: state.USERS, BANK: state.BANK, COMPANIES: state.COMPANIES,
            LOANS: state.LOANS, CHEQUES: state.CHEQUES,
            BLACKLIST: state.BLACKLIST, LOCKED_GROUPS: state.LOCKED_GROUPS,
            COUNCIL_GROUP: state.COUNCIL_GROUP, GOVERNMENT_FUNDS: state.GOVERNMENT_FUNDS,
            GROUP_MESSAGES: state.GROUP_MESSAGES, GROUP_LAST_ACTIVE: state.GROUP_LAST_ACTIVE,
            PENDING_HIRES: state.PENDING_HIRES,
            MODS: CONFIG.MODS, DM_WHITELIST: CONFIG.DM_WHITELIST
        }, null, 2));
    } catch (e) { console.error('Save:', e.message); }
}

function getUser(num) {
    if (!state.USERS[num]) {
        let role = "CITIZEN";
        if (num === CONFIG.OWNERS.FATHER) role = "FATHER";
        if (num === CONFIG.OWNERS.CO_CREATOR) role = "CO_CREATOR";
        if (CONFIG.MODS.includes(num)) role = "MOD";
        state.USERS[num] = {
            xenoShards: 1000, bank: 0, role, status: "Citizen",
            level: 1, joinDate: new Date().toDateString(),
            warns: 0, muted: false, arrested: 0, job: null, company: null,
            debt: 0, memory: { interactions: 0 },
            history: { totalEarned: 0, totalSpent: 0, workShifts: 0 }
        };
    }
    state.USERS[num].memory.interactions++;
    return state.USERS[num];
}

const getBank = n => state.BANK[n] || 0;
function giveXS(n, a) { const u = getUser(n); u.xenoShards += a; u.history.totalEarned += a; }
function takeXS(n, a) { const u = getUser(n); if (u.xenoShards < a) return false; u.xenoShards -= a; u.history.totalSpent += a; return true; }

const isOwner = n => n === CONFIG.OWNERS.FATHER || n === CONFIG.OWNERS.CO_CREATOR;
const isFather = n => n === CONFIG.OWNERS.FATHER;
const isCoCreator = n => n === CONFIG.OWNERS.CO_CREATOR;
const isMod = n => CONFIG.MODS.includes(n);
const isProtected = n => isOwner(n) || isMod(n);
const isDMAllowed = n => CONFIG.DM_WHITELIST.includes(n);
const isBlacklisted = n => state.BLACKLIST.includes(n);
const isLocked = g => state.LOCKED_GROUPS.includes(g);

async function isWaAdmin(sock, g, n) {
    try {
        const m = await sock.groupMetadata(g);
        const p = m.participants.find(x => x.id.split('@')[0].split(':')[0] === n);
        return p && (p.admin === 'admin' || p.admin === 'superadmin');
    } catch (e) { return false; }
}
async function isBotAdmin(sock, g) {
    try {
        const m = await sock.groupMetadata(g);
        const b = sock.user.id.split(':')[0].split('@')[0];
        const p = m.participants.find(x => x.id.split('@')[0].split(':')[0] === b);
        return p && (p.admin === 'admin' || p.admin === 'superadmin');
    } catch (e) { return false; }
}

const clean = n => n ? n.replace(/[^0-9]/g, "") : "";
const random = a => a[Math.floor(Math.random() * a.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));

function getMixedResponse() {
    return random([
        "life is just a series of disappointments.", "another day, another struggle.",
        "nothing really matters anymore.", "the void stares back.",
        "some days i just don't want to wake up.", "happiness is just a myth.",
        "the world is cold, and so am i.", "existence is pain.",
        "the darkness is my only friend.", "nobody really cares.",
        "i'm broken beyond repair.", "Power is not given, it is taken.",
        "In CONCLAVE, loyalty is the only currency that matters.",
        "The night is darkest before the dawn.", "In the end, only the strong survive.",
        "The father protects, the son inherits.", "There is no freedom without discipline.",
        "Trust is a luxury we cannot afford."
    ]);
}

function addConvo(id, user, msg) {
    if (!state.CONVO_MEMORY[id]) state.CONVO_MEMORY[id] = [];
    state.CONVO_MEMORY[id].push({ user, msg, time: Date.now() });
    if (state.CONVO_MEMORY[id].length > 15) state.CONVO_MEMORY[id].shift();
}

function trackMessage(g, n) {
    if (!state.GROUP_MESSAGES[g]) state.GROUP_MESSAGES[g] = {};
    if (!state.GROUP_MESSAGES[g][n]) state.GROUP_MESSAGES[g][n] = 0;
    state.GROUP_MESSAGES[g][n]++;
    state.GROUP_LAST_ACTIVE[g] = Date.now();
}

const GOV_JOBS = [
    { id: 1, title: "🗑️ Garbage Collector", salary: 50, tier: "LOWER" },
    { id: 2, title: "🧹 Street Sweeper", salary: 45, tier: "LOWER" },
    { id: 3, title: "🌳 Gardener", salary: 55, tier: "LOWER" },
    { id: 4, title: "💡 Lamplighter", salary: 40, tier: "LOWER" },
    { id: 5, title: "📦 Warehouse Worker", salary: 60, tier: "LOWER" },
    { id: 6, title: "🚗 Courier", salary: 65, tier: "LOWER" },
    { id: 7, title: "🛠️ Janitor", salary: 50, tier: "LOWER" },
    { id: 8, title: "🍳 Cook", salary: 70, tier: "LOWER" },
    { id: 9, title: "🧑‍🏫 Teacher", salary: 80, tier: "WORKING" },
    { id: 10, title: "🚑 Medic", salary: 90, tier: "WORKING" },
    { id: 11, title: "🛡️ Guard", salary: 75, tier: "WORKING" },
    { id: 12, title: "📝 Clerk", salary: 55, tier: "WORKING" },
    { id: 13, title: "🎨 Designer", salary: 130, tier: "WORKING" },
    { id: 14, title: "📚 Writer", salary: 120, tier: "WORKING" },
    { id: 15, title: "🎵 Musician", salary: 125, tier: "WORKING" },
    { id: 16, title: "📸 Photographer", salary: 115, tier: "WORKING" },
    { id: 17, title: "💻 Developer", salary: 150, tier: "MIDDLE" },
    { id: 18, title: "📊 Data Analyst", salary: 140, tier: "MIDDLE" },
    { id: 19, title: "💰 Accountant", salary: 145, tier: "MIDDLE" },
    { id: 20, title: "🔬 Researcher", salary: 155, tier: "MIDDLE" },
    { id: 21, title: "⚡ Energy Tech", salary: 135, tier: "MIDDLE" },
    { id: 22, title: "🌊 Marine Biologist", salary: 145, tier: "MIDDLE" },
    { id: 23, title: "📈 Marketing Manager", salary: 160, tier: "UPPER" },
    { id: 24, title: "🏗️ Architect", salary: 170, tier: "UPPER" },
    { id: 25, title: "⚖️ Lawyer", salary: 180, tier: "UPPER" },
    { id: 26, title: "🧪 Scientist", salary: 175, tier: "UPPER" },
    { id: 27, title: "📋 Project Manager", salary: 160, tier: "UPPER" },
    { id: 28, title: "🩺 Doctor", salary: 200, tier: "UPPER" },
    { id: 29, title: "🚀 Engineer", salary: 220, tier: "ELITE" },
    { id: 30, title: "🧑‍💼 CEO", salary: 250, tier: "ELITE" }
];

function getUserClass(num) {
    const u = getUser(num);
    let s = u.level * 2 + Math.floor(u.history.totalEarned / 1000) + (u.history.workShifts || 0);
    if (s > 350) return "ELITE";
    if (s > 200) return "UPPER";
    if (s > 100) return "MIDDLE";
    if (s > 50) return "WORKING";
    return "LOWER";
}

module.exports = {
    CONFIG, state, GOV_JOBS,
    loadData, saveData,
    getUser, getBank, giveXS, takeXS,
    isOwner, isFather, isCoCreator, isMod, isProtected,
    isDMAllowed, isBlacklisted, isLocked,
    isWaAdmin, isBotAdmin,
    clean, random, sleep, getMixedResponse,
    addConvo, trackMessage, getUserClass
};
