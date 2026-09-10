const S = require('./systems');
const P = S.CONFIG.PREFIX;

const PROBLEMS = [
    { name: "Employee quit", cost: 500 },
    { name: "Product recall", cost: 2000 },
    { name: "Lawsuit", cost: 3000 },
    { name: "Tax audit", cost: 1500 },
    { name: "Competitor price war", cost: 1000 },
    { name: "Equipment broken", cost: 800 },
    { name: "Bad reviews", cost: 600 },
    { name: "Worker strike", cost: 2500 },
    { name: "Market crash", cost: 5000 },
    { name: "Cyber attack", cost: 1800 }
];

async function handle(c, args, sender, groupId, sock, msg, contextInfo) {
    const user = S.getUser(sender);

    if (c === 'accept') {
        const pending = S.state.PENDING_HIRES?.[sender];
        if (!pending) return "❌ No pending offers.";
        const comp = S.state.COMPANIES[pending.company];
        if (!comp) return "❌ Company gone.";
        comp.employees.push(sender);
        delete S.state.PENDING_HIRES[sender];
        S.saveData();
        return `✅ You joined ${pending.company}.`;
    }
    if (c === 'decline') {
        if (!S.state.PENDING_HIRES?.[sender]) return "❌ No offer.";
        delete S.state.PENDING_HIRES[sender];
        S.saveData();
        return "❌ Offer declined.";
    }

    const sub = (args[0] || '').toLowerCase();
    const name = args[1];

    if (sub === 'create') {
        const cname = args.slice(1).join(' ');
        if (!cname) return `❌ ${P}company create <name>`;
        if (S.state.COMPANIES[cname]) return `❌ Exists.`;
        if (user.xenoShards < S.CONFIG.COMPANY_MIN) return `❌ Need ${S.CONFIG.COMPANY_MIN} XS.`;
        if (!['Middle Class', 'Businessman', 'Elite'].includes(user.status)) {
            return `❌ Need Middle Class status. Yours: ${user.status}`;
        }
        if (user.debt > 0) return `❌ Pay debts first (${user.debt}).`;
        S.takeXS(sender, S.CONFIG.COMPANY_MIN);
        S.state.COMPANIES[cname] = {
            name: cname, owner: sender, employees: [sender], bank: 0,
            level: 1, revenue: 0, expenses: S.CONFIG.COMPANY_MIN,
            taxPaid: 0, founded: new Date().toDateString(), problems: 0
        };
        user.company = cname;
        user.status = "Businessman";
        S.saveData();
        return `🏢 REGISTERED\nName: ${cname}\nCEO: ${sender}\nTax: 15%\n\n💡 ${P}company hire <@user>`;
    }

    if (sub === 'info' || sub === 'profile') {
        const cname = name || user.company;
        if (!cname) return "❌ Which company?";
        const c = S.state.COMPANIES[cname];
        if (!c) return `❌ Not found.`;
        const profit = c.revenue - c.expenses;
        return `🏢 COMPANY PROFILE\n───────────────\n📛 ${c.name}\n👔 CEO: ${c.owner}\n👥 Employees: ${c.employees.length}\n💰 Bank: ${c.bank} XS\n📈 Revenue: ${c.revenue}\n📉 Expenses: ${c.expenses}\n💵 Profit: ${profit}\n🏛️ Tax Paid: ${c.taxPaid}\n⭐ Level: ${c.level}\n⚠️ Problems: ${c.problems}\n📅 Founded: ${c.founded}`;
    }

    if (sub === 'hire') {
        const cname = user.company;
        if (!cname) return "❌ No company.";
        const c = S.state.COMPANIES[cname];
        if (c.owner !== sender) return "❌ Only CEO.";
        let target = S.clean(args[1]) || S.clean(contextInfo?.participant);
        if (!target) return `❌ ${P}company hire <@user>`;
        if (c.employees.includes(target)) return "❌ Already hired.";
        S.state.PENDING_HIRES = S.state.PENDING_HIRES || {};
        S.state.PENDING_HIRES[target] = { company: cname, from: sender, time: Date.now() };
        S.saveData();
        try {
            await sock.sendMessage(target + '@s.whatsapp.net', {
                text: `📨 JOB OFFER\nCompany: ${cname}\nFrom: ${sender}\n\n${P}accept or ${P}decline`
            });
        } catch (e) {}
        return `📨 Offer sent to ${target}.`;
    }

    if (sub === 'fire') {
        const c = S.state.COMPANIES[user.company];
        if (!c || c.owner !== sender) return "❌ Only CEO.";
        let target = S.clean(args[1]) || S.clean(contextInfo?.participant);
        if (!target || target === sender) return "❌ Invalid.";
        if (!c.employees.includes(target)) return "❌ Not employed.";
        c.employees = c.employees.filter(e => e !== target);
        if (S.state.USERS[target]) S.state.USERS[target].company = null;
        S.saveData();
        return `🚪 ${target} fired.`;
    }

    if (sub === 'pay') {
        const cname = args[1];
        const emp = S.clean(args[2]);
        const amt = parseInt(args[3]);
        if (!cname || !emp || !amt) return `❌ ${P}company pay <name> <@> <amt>`;
        const c = S.state.COMPANIES[cname];
        if (!c || c.owner !== sender) return "❌ Only CEO.";
        if (!c.employees.includes(emp)) return "❌ Not employee.";
        if (user.xenoShards < amt) return "❌ Insufficient.";
        S.takeXS(sender, amt);
        if (!S.state.USERS[emp]) S.getUser(emp);
        S.giveXS(emp, amt);
        c.expenses += amt;
        S.saveData();
        return `💸 Paid ${amt} to ${emp}.`;
    }

    if (sub === 'deposit') {
        const c = S.state.COMPANIES[user.company];
        const amt = parseInt(args[1]);
        if (!c) return "❌ No company.";
        if (!amt || amt <= 0) return `❌ ${P}company deposit <amt>`;
        if (!S.takeXS(sender, amt)) return "❌ Insufficient.";
        c.bank += amt;
        S.saveData();
        return `🏦 Deposited ${amt}. Bank: ${c.bank}`;
    }

    if (sub === 'tax') {
        const c = S.state.COMPANIES[user.company];
        if (!c) return "❌ No company.";
        const profit = Math.max(0, c.revenue - c.expenses);
        const tax = Math.floor(profit * S.CONFIG.COMPANY_TAX);
        if (tax === 0) return "ℹ️ No profit. No tax.";
        if (c.bank < tax) return `⚠️ Can't pay ${tax}. Bank: ${c.bank}`;
        c.bank -= tax;
        c.taxPaid += tax;
        S.state.GOVERNMENT_FUNDS += tax;
        S.saveData();
        return `🏛️ Paid ${tax} XS tax.`;
    }

    if (sub === 'top') {
        const sorted = Object.values(S.state.COMPANIES).sort((a, b) => (b.revenue - b.expenses) - (a.revenue - a.expenses)).slice(0, 10);
        let out = `🏆 TOP COMPANIES\n`;
        sorted.forEach((c, i) => { out += `${i + 1}. ${c.name} — ${c.revenue - c.expenses} XS\n`; });
        return out || "📭 None yet.";
    }

    return `🏢 COMPANY\n${P}company create <name>\n${P}company info\n${P}company hire <@>\n${P}company fire <@>\n${P}company pay <name> <@> <amt>\n${P}company deposit <amt>\n${P}company tax\n${P}company top`;
}

function triggerProblems() {
    for (const name in S.state.COMPANIES) {
        const c = S.state.COMPANIES[name];
        if (Math.random() < 0.05) {
            const prob = S.random(PROBLEMS);
            c.expenses += prob.cost;
            c.problems++;
            c.bank = Math.max(0, c.bank - prob.cost);
            console.log(`⚠️ ${c.name}: ${prob.name} (-${prob.cost})`);
        }
        const debt = c.expenses - c.revenue;
        if (debt > S.CONFIG.BANKRUPTCY) {
            const owner = S.getUser(c.owner);
            owner.arrested = Date.now() + 3600000;
            owner.status = "Bankrupt";
            console.log(`🚔 ${c.owner} bankrupt.`);
        }
    }
    S.saveData();
}
setInterval(triggerProblems, 300000);

module.exports = { handle };
