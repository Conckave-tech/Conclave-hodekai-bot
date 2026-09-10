const S = require('./systems');
const P = S.CONFIG.PREFIX;

async function handle(c, args, sender, groupId, sock, msg, contextInfo, isWaAdmin) {
    if (!(S.isProtected(sender) || isWaAdmin)) return "❌ Admins/Mods/Owners only.";
    if (!groupId) return "❌ Groups only.";
    const botAdmin = await S.isBotAdmin(sock, groupId);
    let target = S.clean(args[0]) || S.clean(contextInfo?.participant);

    if (c === 'kick') {
        if (!botAdmin) return "❌ BOT NEEDS TO BE ADMIN.";
        if (!target) return `❌ ${P}kick @user`;
        if (S.isProtected(target)) return "❌ Protected user.";
        try {
            await sock.groupParticipantsUpdate(groupId, [target + "@s.whatsapp.net"], "remove");
            return `⚠️ ${target} kicked.`;
        } catch (e) { return `❌ ${e.message}`; }
    }
    if (c === 'mute') {
        if (!target) return `❌ ${P}mute @user`;
        S.getUser(target).muted = true;
        return `🔇 ${target} muted.`;
    }
    if (c === 'unmute') {
        if (!target) return `❌ ${P}unmute @user`;
        S.getUser(target).muted = false;
        return `🔊 ${target} unmuted.`;
    }
    if (c === 'warn') {
        if (!target) return `❌ ${P}warn @user`;
        const t = S.getUser(target);
        t.warns++;
        return `⚠️ ${target} warned (${t.warns}/3).`;
    }
    if (c === 'close') {
        if (!botAdmin) return "❌ BOT NEEDS TO BE ADMIN.";
        try { await sock.groupSettingUpdate(groupId, "announcement"); return "🔒 Closed."; }
        catch (e) { return `❌ ${e.message}`; }
    }
    if (c === 'open') {
        if (!botAdmin) return "❌ BOT NEEDS TO BE ADMIN.";
        try { await sock.groupSettingUpdate(groupId, "not_announcement"); return "🔓 Opened."; }
        catch (e) { return `❌ ${e.message}`; }
    }
    if (c === 'tagall') {
        const cd = S.state.COOLDOWNS[sender] = S.state.COOLDOWNS[sender] || {};
        if (Date.now() - (cd.tagall || 0) < S.CONFIG.TAGALL_COOLDOWN) {
            const r = Math.ceil((S.CONFIG.TAGALL_COOLDOWN - (Date.now() - cd.tagall)) / 60000);
            return `⏳ Cooldown: ${r}min`;
        }
        cd.tagall = Date.now();
        try {
            const meta = await sock.groupMetadata(groupId);
            const mentions = meta.participants.map(p => p.id);
            let txt = `📢 ATTENTION\n\n`;
            meta.participants.forEach(p => { txt += `@${p.id.split('@')[0]}\n`; });
            await sock.sendMessage(groupId, { text: txt, mentions });
            return null;
        } catch (e) { return `❌ ${e.message}`; }
    }
    if (c === 'promote') {
        if (!botAdmin) return "❌ BOT NEEDS TO BE ADMIN.";
        if (!target) return `❌ ${P}promote @user`;
        try {
            await sock.groupParticipantsUpdate(groupId, [target + "@s.whatsapp.net"], "promote");
            return `👑 ${target} promoted.`;
        } catch (e) { return `❌ ${e.message}`; }
    }
    if (c === 'demote') {
        if (!botAdmin) return "❌ BOT NEEDS TO BE ADMIN.";
        if (!target) return `❌ ${P}demote @user`;
        if (S.isProtected(target)) return "❌ Can't demote protected.";
        try {
            await sock.groupParticipantsUpdate(groupId, [target + "@s.whatsapp.net"], "demote");
            return `⬇️ ${target} demoted.`;
        } catch (e) { return `❌ ${e.message}`; }
    }
    if (c === 'active' || c === 'inactive') {
        const msgs = S.state.GROUP_MESSAGES[groupId] || {};
        const entries = Object.entries(msgs);
        if (!entries.length) return "📭 No data.";
        const sorted = entries.sort((a, b) => c === 'active' ? b[1] - a[1] : a[1] - b[1]);
        const shown = sorted.slice(0, 10);
        let out = c === 'active' ? `📈 TOP ACTIVE\n` : `📉 INACTIVE\n`;
        shown.forEach(([n, count], i) => {
            const medal = c === 'active' ? (['🥇','🥈','🥉'][i] || `${i+1}.`) : `${i+1}.`;
            out += `${medal} ${n} — ${count} msgs\n`;
        });
        return out;
    }
}

async function modHandle(c, args, sender, groupId, sock, msg) {
    if (c === 'lockdown') {
        if (!S.isProtected(sender)) return "❌ Owners/Mods only.";
        if (!groupId) return "❌ Groups only.";
        if (!S.state.LOCKED_GROUPS.includes(groupId)) S.state.LOCKED_GROUPS.push(groupId);
        return "🔒 Locked.";
    }
    if (c === 'unlock') {
        if (!S.isProtected(sender)) return "❌ Owners/Mods only.";
        if (!groupId) return "❌ Groups only.";
        S.state.LOCKED_GROUPS = S.state.LOCKED_GROUPS.filter(g => g !== groupId);
        return "🔓 Unlocked.";
    }
    if (c === 'setcouncil') {
        if (!S.isOwner(sender)) return "❌ Owners only.";
        if (!groupId) return "❌ Groups only.";
        S.state.COUNCIL_GROUP = groupId;
        S.saveData();
        return "✅ COUNCIL set.";
    }
    if (c === 'mod') {
        if (!S.isOwner(sender)) return "❌ Owners only.";
        const sub = args[0];
        const target = S.clean(args[1]);
        if (sub === 'add' && target) {
            if (!S.CONFIG.MODS.includes(target)) {
                S.CONFIG.MODS.push(target);
                S.CONFIG.DM_WHITELIST.push(target);
                S.saveData();
                return `✅ ${target} is MOD.`;
            }
            return "ℹ️ Already mod.";
        }
        if (sub === 'remove' && target) {
            S.CONFIG.MODS = S.CONFIG.MODS.filter(m => m !== target);
            S.CONFIG.DM_WHITELIST = S.CONFIG.DM_WHITELIST.filter(m => m !== target);
            S.saveData();
            return `✅ ${target} removed.`;
        }
        if (sub === 'list' || !sub) {
            return `⚡ MODS\n${S.CONFIG.MODS.map((m, i) => `${i + 1}. ${m}`).join('\n')}`;
        }
        return `❌ ${P}mod add/remove/list`;
    }
}

module.exports = { handle, modHandle };
