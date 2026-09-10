const S = require('./systems');
const P = S.CONFIG.PREFIX;

function menuBox() {
    return `╔══════════════════════════════════════════════╗
║           🖤 𝗛𝗢𝗗𝗘𝗞𝗔𝗜 𝗠𝗘𝗡𝗨 v5.0              ║
╠══════════════════════════════════════════════╣
║  📌 𝗜𝗡𝗙𝗢
║  ${P}bot          — Bot info
║  ${P}profile      — Your ID card
║  ${P}bal          — Balance
║  ${P}ping         — Test
║  ${P}members      — Count
║  ${P}status       — Status
║  ${P}modlist      — Hierarchy
║
║  💰 𝗘𝗖𝗢𝗡𝗢𝗠𝗬
║  ${P}daily        — 100 XS/day
║  ${P}pay <num> <amt>
║  ${P}bank dep/wit/bal
║  ${P}loan <amt>
║  ${P}repay <amt>
║  ${P}cheque <@> <amt>
║  ${P}cheques
║  ${P}rob <@>
║
║  💼 𝗝𝗢𝗕𝗦
║  ${P}jobs         — See jobs
║  ${P}govjob <id>  — Take job
║  ${P}work         — Work shift
║  ${P}myjob        — View job
║  ${P}resign       — Quit
║
║  🏢 𝗖𝗢𝗠𝗣𝗔𝗡𝗬
║  ${P}company create <name>
║  ${P}company info
║  ${P}company hire <@>
║  ${P}company fire <@>
║  ${P}company pay <name> <@> <amt>
║  ${P}company deposit <amt>
║  ${P}company tax
║  ${P}company top
║  ${P}accept / ${P}decline
║
║  😈 𝗙𝗨𝗡
║  ${P}roast <@>
║  ${P}compliment <@>
║  ${P}joke
║  ${P}truth
║  ${P}dare
║  ${P}tod
║  ${P}8ball <q>
║  ${P}coinflip
║  ${P}guess <n>
║
║  🎵 𝗠𝗨𝗦𝗜𝗖
║  ${P}play <song>
║  ${P}musiclist
║
║  🎨 𝗦𝗧𝗜𝗖𝗞𝗘𝗥𝗦
║  ${P}s            — Image → Sticker (reply)
║  ${P}st           — Sticker → Image (reply)
║
║  📦 𝗕𝗢𝗫𝗘𝗦
║  ${P}menu ${P}boxes ${P}all ${P}gs ${P}rules
║
║  🛡️ 𝗔𝗗𝗠𝗜𝗡
║  ${P}kick ${P}mute ${P}unmute ${P}warn
║  ${P}close ${P}open ${P}delete
║  ${P}tagall ${P}promote ${P}demote
║  ${P}active ${P}inactive
║
║  ⚡ 𝗠𝗢𝗗
║  ${P}mod add/remove/list
║  ${P}lockdown ${P}unlock
║  ${P}setcouncil
║
║  💡 𝗢𝗧𝗛𝗘𝗥
║  ${P}suggest <cat> | <title> | <desc>
║  ${P}help <command>
╚══════════════════════════════════════════════╝

${S.getMixedResponse()}`;
}

function botBox() {
    return `╔══════════════════════════════════════════════╗
║              🖤 𝗛𝗢𝗗𝗘𝗞𝗔𝗜                       ║
╠══════════════════════════════════════════════╣
║  📌 NAME: Hodekai
║  👑 FATHER: ${S.CONFIG.OWNERS.FATHER}
║  🏆 CO-CREATOR: ${S.CONFIG.OWNERS.CO_CREATOR}
║  🏛️ COMPANY: CONCLAVE HOLDINGS
║  📱 VERSION: v${S.CONFIG.VERSION}
║  🟢 STATUS: ${S.state.BOT_ACTIVE ? 'ONLINE' : 'OFFLINE'}
╠══════════════════════════════════════════════╣
║  📊 STATS
║  👥 Citizens: ${Object.keys(S.state.USERS).length}
║  ⚡ Mods: ${S.CONFIG.MODS.length}
║  🏢 Companies: ${Object.keys(S.state.COMPANIES).length}
║  🏛️ Treasury: ${S.state.GOVERNMENT_FUNDS} XS
╚══════════════════════════════════════════════╝

${S.getMixedResponse()}`;
}

function profileBox(num) {
    const u = S.getUser(num);
    const bank = S.getBank(num);
    const id = num.slice(-5).padStart(5, '0');
    return `╔══════════════════════════════════════════════╗
║           🧥 𝗖𝗢𝗡𝗖𝗟𝗔𝗩𝗘 𝗜𝗗 𝗖𝗔𝗥𝗗                 ║
╠══════════════════════════════════════════════╣
║  🆔 ID: #${id}
║  📱 Number: ${num}
║  👤 Role: ${u.role}
║  📊 Status: ${u.status}
║  ⭐ Level: ${u.level}
║  📅 Joined: ${u.joinDate}
╠══════════════════════════════════════════════╣
║  💰 Wallet: ${u.xenoShards} XS
║  🏦 Bank: ${bank} XS
║  💎 Total: ${u.xenoShards + bank} XS
║  💳 Debt: ${u.debt || 0} XS
╠══════════════════════════════════════════════╣
║  ⚠️ Warns: ${u.warns}
║  🔇 Muted: ${u.muted ? 'Yes' : 'No'}
║  💼 Job: ${u.job ? u.job.title : 'None'}
║  🏢 Company: ${u.company || 'None'}
╚══════════════════════════════════════════════╝

${S.getMixedResponse()}`;
}

function modListBox() {
    let out = `╔══════════════════════════════════════════════╗
║           ⚡ 𝗣𝗢𝗪𝗘𝗥 𝗛𝗜𝗘𝗥𝗔𝗥𝗖𝗛𝗬                    ║
╠══════════════════════════════════════════════╣
║  👑 𝗢𝗪𝗡𝗘𝗥𝗦
║  1. ${S.CONFIG.OWNERS.FATHER}  (Father)
║  2. ${S.CONFIG.OWNERS.CO_CREATOR}  (Co-Creator)
╠══════════════════════════════════════════════╣
║  ⚡ 𝗠𝗢𝗗𝗦 (${S.CONFIG.MODS.length})
`;
    S.CONFIG.MODS.forEach((m, i) => { out += `║  ${i + 1}. ${m}\n`; });
    out += `╚══════════════════════════════════════════════╝\n\n${S.getMixedResponse()}`;
    return out;
}

function gsBox(g) {
    const msgs = S.state.GROUP_MESSAGES[g] || {};
    const users = Object.entries(msgs).sort((a, b) => b[1] - a[1]);
    const total = users.reduce((s, [_, c]) => s + c, 0);
    const top = users.slice(0, 3).map(([n, c], i) => `║  ${['🥇','🥈','🥉'][i]} ${n} — ${c} msgs`).join('\n') || '║  (none)';
    const pct = users.length > 0 ? Math.min(100, Math.round((users.length / 10) * 100)) : 0;
    const status = pct > 60 ? '🔥 ACTIVE' : pct > 30 ? '😐 MODERATE' : '💀 DEAD';
    const roast = pct < 30 ? '\n💀 This group is deader than my feelings.' : '';

    return `╔══════════════════════════════════════════════╗
║        🖤 𝗖𝗢𝗡𝗖𝗟𝗔𝗩𝗘 𝗚𝗥𝗢𝗨𝗣 𝗜𝗡𝗧𝗘𝗟             ║
╠══════════════════════════════════════════════╣
║  📊 POPULATION
║  👥 Active Users: ${users.length}
║  💬 Total Messages: ${total}
║  📈 Activity: ${pct}% ${status}
╠══════════════════════════════════════════════╣
║  🏆 TOP CITIZENS
${top}
╠══════════════════════════════════════════════╣
║  🖤 CONCLAVE STATUS
║  🟢 System: ONLINE
║  ⚡ Bot: Hodekai
╚══════════════════════════════════════════════╝${roast}

${S.getMixedResponse()}`;
}

function rulesBox() {
    return `╔══════════════════════════════════════════════╗
║           📜 𝗖𝗢𝗡𝗖𝗟𝗔𝗩𝗘 𝗥𝗨𝗟𝗘𝗦                       ║
╠══════════════════════════════════════════════╣
║  1. Loyalty above all.
║  2. Respect all citizens.
║  3. No scamming members.
║  4. Pay your taxes.
║  5. Honor your debts.
║  6. Thieves risk arrest and shame.
║  7. Mods are the law in their groups.
║  8. Do not betray CONCLAVE.
║  9. Work hard. Earn well. Live long.
║  10. CONCLAVE AWAITS!!!
╚══════════════════════════════════════════════╝

${S.getMixedResponse()}`;
}

function allBoxesBox() {
    return `╔══════════════════════════════════════════════╗
║           📦 𝗔𝗟𝗟 𝗔𝗩𝗔𝗜𝗟𝗔𝗕𝗟𝗘 𝗕𝗢𝗫𝗘𝗦                ║
╠══════════════════════════════════════════════╣
║  ${P}menu      — Main menu
║  ${P}bot       — Bot info
║  ${P}profile   — Your profile
║  ${P}boxes     — This box
║  ${P}gs        — Group stats
║  ${P}rules     — Conclave rules
║  ${P}job       — Job help
║  ${P}company   — Company help
║  ${P}modlist   — Power hierarchy
║  ${P}all       — Master list
╚══════════════════════════════════════════════╝

${S.getMixedResponse()}`;
}

module.exports = { menuBox, botBox, profileBox, modListBox, gsBox, rulesBox, allBoxesBox }; 
