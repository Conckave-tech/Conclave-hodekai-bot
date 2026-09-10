const S = require('./systems');
const P = S.CONFIG.PREFIX;

async function handle(c, args, sender, groupId, sock, msg, contextInfo, isDM) {
    const user = S.getUser(sender);

    if (c === 'daily') {
        const now = Date.now();
        const cd = S.state.COOLDOWNS[sender] = S.state.COOLDOWNS[sender] || {};
        if (now - (cd.daily || 0) < 86400000) {
            const h = Math.ceil((86400000 - (now - cd.daily)) / 3600000);
            return `⏳ Come back in ${h}h`;
        }
        cd.daily = now;
        S.giveXS(sender, 100);
        return `📅 +100 XS! Balance: ${user.xenoShards}\n\n${S.getMixedResponse()}`;
    }

    if (c === 'pay') {
        let target = S.clean(args[0]);
        if (!target && contextInfo?.participant) target = S.clean(contextInfo.participant);
        const amt = parseInt(args[1]);
        if (!target || !amt || amt <= 0) return `❌ ${P}pay <number> <amount>`;
        if (user.xenoShards < amt) return `❌ You have ${user.xenoShards} XS.`;
        if (user.debt > 0) return `🚫 You're in debt. Pay first.`;
        S.takeXS(sender, amt);
        if (!S.state.USERS[target]) S.getUser(target);
        const receiver = S.getUser(target);
        if (S.state.BANK[target] > 0) {
            S.state.BANK[target] += amt;
        } else {
            S.giveXS(target, amt);
        }
        return `💸 Sent ${amt} XS to ${target}\n\n${S.getMixedResponse()}`;
    }

    if (c === 'bank') {
        const sub = args[0];
        if (sub === 'dep') {
            const amt = parseInt(args[1]);
            if (!amt || amt <= 0) return `❌ ${P}bank dep <amt>`;
            if (!S.takeXS(sender, amt)) return "❌ Insufficient.";
            S.state.BANK[sender] = (S.state.BANK[sender] || 0) + amt;
            return `🏦 Deposited ${amt}. Bank: ${S.state.BANK[sender]}`;
        }
        if (sub === 'wit') {
            const amt = parseInt(args[1]);
            if (!amt || (S.state.BANK[sender] || 0) < amt) return "❌ Insufficient.";
            S.state.BANK[sender] -= amt;
            S.giveXS(sender, amt);
            return `🏦 Withdrew ${amt}. Wallet: ${user.xenoShards}`;
        }
        if (sub === 'bal') return `🏦 Bank: ${S.getBank(sender)} XS`;
        return `❌ ${P}bank dep/wit/bal`;
    }

    if (c === 'loan') {
        if (user.debt > 0) return `🚫 You owe ${user.debt} XS.`;
        const amt = parseInt(args[0]);
        if (!amt || amt < 100) return `❌ ${P}loan <amt> (min 100)`;
        if (amt > 10000) return "❌ Max 10,000 XS";
        const totalAssets = user.xenoShards + S.getBank(sender) + (user.company ? 1 : 0);
        if (totalAssets <= 0) return "❌ No collateral.";
        S.giveXS(sender, amt);
        user.debt = (user.debt || 0) + amt;
        S.state.LOANS[sender] = { amount: amt, taken: Date.now(), due: Date.now() + 7 * 86400000 };
        S.saveData();
        return `💰 LOAN APPROVED\nAmount: ${amt} XS\nInterest: 0.1%/week\nDebt total: ${user.debt}\n\n💡 ${P}repay <amt>`;
    }

    if (c === 'repay') {
        if (!user.debt || user.debt <= 0) return "ℹ️ No debt.";
        const amt = parseInt(args[0]);
        if (!amt || amt <= 0) return `❌ ${P}repay <amt>`;
        if (!S.takeXS(sender, amt)) return "❌ Insufficient.";
        user.debt -= amt;
        if (user.debt < 0) { S.giveXS(sender, -user.debt); user.debt = 0; }
        S.state.GOVERNMENT_FUNDS += amt;
        S.saveData();
        return `✅ Repaid ${amt}.\nRemaining: ${user.debt}\n\n${S.getMixedResponse()}`;
    }

    if (c === 'loans') {
        const list = Object.entries(S.state.LOANS);
        if (!list.length) return "📭 No loans.";
        let out = `💰 ACTIVE LOANS\n`;
        list.slice(0, 10).forEach(([n, l]) => { out += `${n} — ${l.amount} XS\n`; });
        return out;
    }

    if (c === 'cheque') {
        let target = S.clean(args[0]);
        if (!target && contextInfo?.participant) target = S.clean(contextInfo.participant);
        const amt = parseInt(args[1]);
        if (!target || !amt || amt <= 0) return `❌ ${P}cheque <@user> <amt>`;
        if (user.xenoShards < amt) return `❌ You have ${user.xenoShards} XS.`;
        const id = Date.now().toString().slice(-6);
        if (!S.state.CHEQUES[sender]) S.state.CHEQUES[sender] = [];
        S.state.CHEQUES[sender].push({
            id, to: target, amount: amt, from: sender,
            signed: Date.now(), expires: Date.now() + S.CONFIG.CHEQUE_EXPIRY, cashed: false
        });
        S.takeXS(sender, amt);
        S.saveData();
        try {
            await sock.sendMessage(target + '@s.whatsapp.net', {
                text: `📝 CHEQUE RECEIVED\nFrom: ${sender}\nAmount: ${amt} XS\nID: #${id}\n\nType ${P}cheques to cash.`
            });
        } catch (e) {}
        return `📝 CHEQUE SIGNED\nID: #${id}\nTo: ${target}\nAmount: ${amt} XS\nExpires: 2 days`;
    }

    if (c === 'cheques') {
        let pending = [];
        for (const owner in S.state.CHEQUES) {
            for (const ch of S.state.CHEQUES[owner]) {
                if (ch.to === sender && !ch.cashed && ch.expires > Date.now()) {
                    pending.push({ ...ch, from: owner });
                }
            }
        }
        if (!pending.length) return "📭 No pending cheques.";
        const ch = pending[0];
        S.giveXS(sender, ch.amount);
        ch.cashed = true;
        S.saveData();
        return `💰 CHEQUE CASHED\nID: #${ch.id}\nFrom: ${ch.from}\nAmount: ${ch.amount} XS\n\n💵 Balance: ${user.xenoShards}`;
    }

    if (c === 'rob') {
        let target = S.clean(args[0]);
        if (!target && contextInfo?.participant) target = S.clean(contextInfo.participant);
        if (!target) return `❌ ${P}rob <@user>`;
        if (target === sender) return "❌ Can't rob yourself.";
        if (S.isProtected(target)) return "❌ Protected user.";
        const t = S.getUser(target);
        const cd = S.state.COOLDOWNS[sender] = S.state.COOLDOWNS[sender] || {};
        if (Date.now() - (cd.rob || 0) < 3600000) {
            const r = Math.ceil((3600000 - (Date.now() - cd.rob)) / 60000);
            return `⏳ Wait ${r}min.`;
        }
        cd.rob = Date.now();
        if (Math.random() > 0.5) {
            const stolen = Math.min(t.xenoShards, Math.floor(t.xenoShards * 0.2));
            if (stolen <= 0) return "😐 Target has nothing.";
            S.takeXS(target, stolen);
            S.giveXS(sender, stolen);
            return `🥷 ROBBERY SUCCESS\nStole: ${stolen} XS from ${target}\n\n${S.getMixedResponse()}`;
        } else {
            user.arrested = Date.now() + 3600000;
            user.status = "Arrested";
            const fine = Math.min(user.xenoShards, 500);
            S.takeXS(sender, fine);
            S.state.GOVERNMENT_FUNDS += fine;
            S.saveData();
            return `🚔 CAUGHT!\nYou tried to rob ${target} and FAILED.\n\n⛓️ Arrested 1 hour\n💸 Fine: ${fine} XS\n\n💀 SHAME. SHAME. SHAME.`;
        }
    }

    return null;
}

module.exports = { handle };
