const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const S = require('./systems');
const C = require('./commands');
require('./cmd-company');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_NUMBER = process.env.BOT_NUMBER || "256775032199";
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys_v9');
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

app.use(cors());
app.use(express.json());

let pairingRequested = false;
let isConnected = false;
let reconnectAttempts = 0;
let activeSocket = null;

function getHumanResponse(msg, sender) {
    const lower = msg.toLowerCase().trim();
    if (/^(hi|hello|hey|yo|sup|wassup)$/i.test(lower)) {
        if (S.isFather(sender)) return S.random(["Father. I'm listening.", "Yes, Father.", "What do you need, Father?"]);
        if (S.isCoCreator(sender)) return S.random(["Tch. You again.", "The clumsy one returns.", "What did you break this time?"]);
        if (S.isMod(sender)) return S.random(["Hey, mod.", "What's up.", "Everything under control?"]);
        return S.random(["tch. you're here again.", "what.", "oh. it's you.", "hey. whatever."]);
    }
    if (lower.includes('how are you')) return S.random(["*sigh* tired.", "could be better.", "same as always."]);
    if (lower.includes('hodekai') || lower.includes('bot')) {
        if (S.isFather(sender)) return "Yes, Father?";
        if (S.isCoCreator(sender)) return "Tch. What?";
        return S.random(["you called?", "what.", "i heard that.", "yes?"]);
    }
    if (/\b(bye|goodbye|later)\b/i.test(lower)) return S.random(["later.", "finally. peace.", "bye."]);
    if (lower.includes('thanks')) return S.random(["mhm.", "sure.", "whatever."]);
    return S.getMixedResponse();
}

async function connectWhatsApp() {
    if (isConnected && activeSocket) return;
    if (reconnectAttempts >= 3) return console.log('❌ Max reconnects.');

    try {
        console.log(`📱 Connecting (${reconnectAttempts}/3)...`);
        if (activeSocket) { try { activeSocket.end(undefined); } catch (e) {} activeSocket = null; }

        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version, auth: state,
            keepAliveIntervalMs: 30000, markOnlineOnConnect: true,
            syncFullHistory: false, generateHighQualityLinkPreview: false
        });
        activeSocket = sock;

        if (!state.creds.registered && !pairingRequested) {
            pairingRequested = true;
            setTimeout(async () => {
                try {
                    if (state.creds.registered) return;
                    console.log('🔑 Requesting pairing code...');
                    const code = await sock.requestPairingCode(BOT_NUMBER);
                    console.log('\n╔════════════════════════════════╗');
                    console.log('║  🔑 PAIRING CODE               ║');
                    console.log(`║  CODE: ${code}              ║`);
                    console.log('║  ⏰ Expires in 3 minutes        ║');
                    console.log('╚════════════════════════════════╝\n');
                    setTimeout(() => { pairingRequested = false; console.log('⏰ Code expired.'); }, 180000);
                } catch (err) { console.error('Pairing:', err.message); }
            }, 3000);
        }

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'open') {
                isConnected = true; reconnectAttempts = 0;
                console.log('\n╔════════════════════════════════════════╗');
                console.log('║   🖤 HODEKAI CONNECTED!                 ║');
                console.log('║   CONCLAVE AWAITS!!!                    ║');
                console.log('╚════════════════════════════════════════╝\n');
            }
            if (connection === 'close') {
                isConnected = false;
                const code = lastDisconnect?.error?.output?.statusCode;
                const loggedOut = code === DisconnectReason.loggedOut;
                console.log(`⚠️ Closed: ${code}`);
                if (loggedOut) return console.log('🚪 Logged out.');
                if (reconnectAttempts < 3) { reconnectAttempts++; setTimeout(connectWhatsApp, 5000); }
            }
        });

        sock.ev.on('messages.upsert', async m => {
            if (!S.state.BOT_ACTIVE || m.type !== 'notify') return;
            for (const msg of m.messages) {
                try {
                    if (!msg.message || msg.key.fromMe) continue;
                    const isGroup = msg.key.remoteJid.endsWith('@g.us');
                    const rawSender = isGroup ? msg.key.participant : msg.key.remoteJid;
                    if (!rawSender) continue;
                    const sender = rawSender.split('@')[0].split(':')[0];
                    const groupId = isGroup ? msg.key.remoteJid : null;

                    if (isGroup && S.isLocked(groupId) && !S.isProtected(sender)) continue;
                    if (S.isBlacklisted(sender) && !S.isOwner(sender)) continue;
                    if (S.getUser(sender).muted && !S.isOwner(sender)) continue;
                    if (!isGroup && !S.isDMAllowed(sender)) { console.log(`🚫 DM blocked: ${sender}`); continue; }

                    if (isGroup) S.trackMessage(groupId, sender);

                    let text = '', isSticker = false;
                    if (msg.message.conversation) text = msg.message.conversation;
                    else if (msg.message.extendedTextMessage) text = msg.message.extendedTextMessage.text;
                    else if (msg.message.stickerMessage) isSticker = true;
                    else if (msg.message.imageMessage?.caption) text = msg.message.imageMessage.caption;

                    const contextInfo = msg.message.extendedTextMessage?.contextInfo;
                    S.addConvo(groupId || sender, sender, text || '[sticker]');

                    if (isSticker) {
                        const reply = "🎨 " + S.random(["nice sticker", "lol", "bruh", "cool", "W sticker"]);
                        await sock.sendMessage(msg.key.remoteJid, { text: reply }, { quoted: msg });
                        continue;
                    }

                    if (text && text.startsWith(S.CONFIG.PREFIX)) {
                        const command = text.slice(1).trim();
                        const args = command.split(/\s+/);
                        const cmd = args.shift().toLowerCase();
                        const isWaAdmin = isGroup ? await S.isWaAdmin(sock, groupId, sender) : false;
                        await S.sleep(2000 + Math.random() * 2000);
                        const reply = await C.handleCommand(cmd, args, sender, groupId, sock, msg, contextInfo, !isGroup, isWaAdmin);
                        if (reply) {
                            await S.sleep(S.CONFIG.RESPONSE_DELAY);
                            await sock.sendMessage(msg.key.remoteJid, { text: reply }, { quoted: msg });
                        }
                        continue;
                    }

                    if (text) {
                        const lower = text.toLowerCase();
                        const mentioned = lower.includes('hodekai') || lower.includes('@hodekai');
                        if (!isGroup || mentioned || S.isProtected(sender)) {
                            const reply = getHumanResponse(text, sender);
                            if (reply) {
                                await S.sleep(S.CONFIG.RESPONSE_DELAY);
                                await sock.sendMessage(msg.key.remoteJid, { text: reply }, { quoted: msg });
                            }
                        }
                    }
                } catch (e) { console.error('Msg error:', e.message); }
            }
        });

        sock.ev.on('groups.upsert', async (groups) => {
            for (const g of groups) {
                console.log('📥 Added to:', g.id);
                setTimeout(async () => {
                    try {
                        const meta = await sock.groupMetadata(g.id);
                        const members = meta.participants.map(p => p.id.split('@')[0].split(':')[0]);
                        const hasAuth = members.some(m => S.isProtected(m));
                        if (!hasAuth && !S.isLocked(g.id)) {
                            S.state.LOCKED_GROUPS.push(g.id);
                            S.saveData();
                            await sock.sendMessage(g.id, { text: "🔒 LOCKDOWN\nNo owner/mod detected.\nType :unlock to restore." });
                        }
                    } catch (e) {}
                }, 900000);
            }
        });

        sock.ev.on('creds.update', saveCreds);
    } catch (err) {
        console.error('Connect:', err.message);
        if (reconnectAttempts < 3) { reconnectAttempts++; setTimeout(connectWhatsApp, 5000); }
    }
}

app.get('/', (req, res) => {
    res.json({
        status: "🖤 HODEKAI ONLINE",
        message: "CONCLAVE AWAITS!!!",
        members: Object.keys(S.state.USERS).length,
        mods: S.CONFIG.MODS.length,
        companies: Object.keys(S.state.COMPANIES).length,
        treasury: S.state.GOVERNMENT_FUNDS,
        whatsapp: isConnected ? "CONNECTED" : "DISCONNECTED",
        uptime: process.uptime()
    });
});
app.get('/ping', (req, res) => res.send('pong'));
app.listen(PORT, () => console.log(`🌐 Port ${PORT}`));

S.loadData();
setInterval(S.saveData, 30000);

console.log('🖤 HODEKAI BOT v5.0\n🏛️ CONCLAVE AWAITS!!!');
connectWhatsApp();

process.on('SIGINT', () => { S.saveData(); process.exit(0); });
process.on('SIGTERM', () => { S.saveData(); process.exit(0); });
process.on('uncaughtException', (e) => { console.error('❌', e.message); S.saveData(); });
process.on('unhandledRejection', (e) => { console.error('❌', e); });
