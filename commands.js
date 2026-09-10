const S = require('./systems');
const B = require('./boxes');
const Econ = require('./cmd-economy');
const Company = require('./cmd-company');
const Admin = require('./cmd-admin');
const Fun = require('./cmd-fun');

const P = S.CONFIG.PREFIX;

async function handleCommand(cmd, args, sender, groupId, sock, msg, contextInfo, isDM, isWaAdmin) {
    const user = S.getUser(sender);
    const c = cmd.toLowerCase();

    // INFO
    if (c === 'menu') return B.menuBox();
    if (c === 'bot' || c === 'botinfo') return B.botBox();
    if (c === 'profile') return B.profileBox(sender);
    if (c === 'modlist') return B.modListBox();
    if (c === 'rules') return B.rulesBox();
    if (c === 'boxes' || c === 'all') return B.allBoxesBox();

    if (c === 'bal') {
        const bank = S.getBank(sender);
        return `💰 Wallet: ${user.xenoShards} XS\n🏦 Bank: ${bank} XS\n💎 Total: ${user.xenoShards + bank} XS\n💳 Debt: ${user.debt || 0} XS\n\n${S.getMixedResponse()}`;
    }

    if (c === 'ping') {
        try {
            const emoji = S.isProtected(sender) ? '🖤' : '🏓';
            await sock.sendMessage(groupId || sender, { react: { text: emoji, key: msg.key } });
        } catch (e) {}
        return S.isProtected(sender)
            ? `🖤 HODEKAI IS ALIVE!\n⚡ Uptime: ${Math.floor(process.uptime())}s\n\n${S.getMixedResponse()}`
            : `🏓 Pong!`;
    }

    if (c === 'members') return `👥 Members: ${Object.keys(S.state.USERS).length}\n⚡ Mods: ${S.CONFIG.MODS.length}\n\n${S.getMixedResponse()}`;

    if (c === 'status') {
        return `📊 STATUS\n🟢 ONLINE\n👥 ${Object.keys(S.state.USERS).length} members\n⚡ ${S.CONFIG.MODS.length} mods\n🏢 ${Object.keys(S.state.COMPANIES).length} companies\n🏛️ ${S.state.GOVERNMENT_FUNDS} XS treasury\n\n${S.getMixedResponse()}`;
    }

    if (c === 'gs') {
        if (!groupId) return "❌ Groups only.";
        return B.gsBox(groupId);
    }

    if (c === 'help') {
        const q = args[0];
        if (!q) return `💡 ${P}help <command>`;
        const help = {
            cheque: `${P}cheque <@user> <amt>\nSign a cheque. Receiver cashes in 2 days.`,
            loan: `${P}loan <amt>\nBot loan. Interest: 0.1%/week.`,
            company: `${P}company create <name>\nNeeds: ${S.CONFIG.COMPANY_MIN} XS + Middle Class`,
            suggest: `${P}suggest <cat> | <title> | <desc>`,
            rob: `${P}rob <@user>\nRisk: arrest + shame.`
        };
        return help[q.toLowerCase()] || `❌ No help for '${q}'.`;
    }

    // SUGGESTIONS
    if (c === 'suggest') {
        const fullText = args.join(' ');
        const parts = fullText.split('|').map(s => s.trim());
        if (parts.length < 3) return `❌ ${P}suggest <category> | <title> | <description>`;
        if (S.state.COUNCIL_GROUP) {
            const report = `📨 NEW SUGGESTION\n───────────────\n👤 ${sender}\n📂 ${parts[0]}\n📌 ${parts[1]}\n📝 ${parts[2]}\n📅 ${new Date().toLocaleString()}`;
            try { await sock.sendMessage(S.state.COUNCIL_GROUP, { text: report }); } catch (e) {}
        }
        return `✅ Sent to COUNCIL.\n\n${S.getMixedResponse()}`;
    }

    // ECONOMY
    if (['daily', 'pay', 'bank', 'loan', 'repay', 'loans', 'cheque', 'cheques', 'rob'].includes(c)) {
        return await Econ.handle(c, args, sender, groupId, sock, msg, contextInfo, isDM);
    }

    // COMPANY
    if (['company', 'accept', 'decline'].includes(c)) {
        return await Company.handle(c, args, sender, groupId, sock, msg, contextInfo);
    }

    // ADMIN
    if (['kick', 'mute', 'unmute', 'warn', 'close', 'open', 'tagall', 'promote', 'demote', 'active', 'inactive'].includes(c)) {
        return await Admin.handle(c, args, sender, groupId, sock, msg, contextInfo, isWaAdmin);
    }

    // MOD
    if (['mod', 'lockdown', 'unlock', 'setcouncil'].includes(c)) {
        return await Admin.modHandle(c, args, sender, groupId, sock, msg);
    }

    // FUN
    if (['roast', 'compliment', 'joke', 'truth', 'dare', 'tod', '8ball', 'coinflip', 'guess', 'play', 'musiclist', 's', 'st'].includes(c)) {
        return await Fun.handle(c, args, sender, groupId, sock, msg, contextInfo);
    }

    return null;
}

module.exports = { handleCommand };
