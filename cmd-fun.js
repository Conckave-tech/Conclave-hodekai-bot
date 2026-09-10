const S = require('./systems');
const P = S.CONFIG.PREFIX;

const JOKES = [
    "Why do bots never get lost? They follow the path.",
    "What's a bot's favorite drink? Java.",
    "Why don't bots play cards? Too many cheats.",
    "I told my bot a joke... it didn't process.",
    "Why did the bot break up with the human? Too many emotional bugs.",
    "A bot walks into a bar. Bar: 'We don't serve your kind.' Bot: 'I know. I'm here to fix your Wi-Fi.'",
    "Why was the robot angry? Someone kept pushing its buttons.",
    "What did the bot say to the virus? You're not my type."
];

const TRUTHS = [
    "What's the last lie you told?",
    "Who in this group would you trust with a secret?",
    "What's your biggest regret?",
    "Have you ever stolen something?",
    "Who's your secret crush?",
    "What's the most embarrassing thing you've done?",
    "Have you ever cheated on a test?",
    "What's your biggest fear?",
    "Have you ever pretended to like someone you hate?",
    "What's the worst thing you've said to someone?"
];

const DARES = [
    "Send the last photo in your gallery.",
    "Send a voice note singing.",
    "Send a selfie right now.",
    "Confess a crush.",
    "Text your ex 'I miss you' and screenshot.",
    "Change your WhatsApp status to something embarrassing for 1 hour.",
    "Share your search history.",
    "Voice note something embarrassing."
];

const EIGHTBALL = ["Yes.", "No.", "Maybe.", "Ask again later.", "Absolutely not.", "Without a doubt.", "Very doubtful.", "Signs point to yes.", "Don't count on it.", "My sources say no."];

const AUDIO = {
    "despacito": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "shape of you": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    "blinding lights": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    "dance monkey": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    "rockstar": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    "believer": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    "thunder": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    "senorita": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    "conclave anthem": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    "hodekai theme": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3"
};

async function handle(c, args, sender, groupId, sock, msg, contextInfo) {
    const user = S.getUser(sender);

    if (c === 'roast' || c === 'compliment') {
        let target = S.clean(args[0]);
        if (!target && contextInfo?.participant) target = S.clean(contextInfo.participant);
        if (!target) return `❌ ${P}${c} @user OR reply with ${P}${c}`;
        if (sender === target) return `❌ Can't ${c} yourself.`;
        if (!S.state.USERS[target]) S.getUser(target);
        if (c === 'roast') {
            const roasts = [
                "You're like a software update - nobody wants you.",
                "Your brain is like a browser - 10 tabs open, all frozen.",
                "You're the NPC everyone skips.",
                "You're proof evolution can go in reverse.",
                "I'd roast you but that's a waste of fire.",
                "You bring so much joy... when you leave.",
                "You're the reason shampoo has instructions.",
                "You're like a broken pencil - pointless.",
                "You're a Monday - nobody likes you."
            ];
            return `🔥 ROASTED!\n───────────────\n💀 ${S.random(roasts)}\n───────────────\n🎯 Target: ${target}\n📝 Roaster: ${sender}\n\n${S.getMixedResponse()}`;
        } else {
            const comps = [
                "You're actually not that bad.", "You have potential... don't waste it.",
                "You're doing better than most.", "You have moments of being tolerable.",
                "You're secretly cool.", "You're the kind of person I'd tolerate for free."
            ];
            return `💖 COMPLIMENTED!\n───────────────\n✨ ${S.random(comps)}\n───────────────\n🎯 Target: ${target}\n💝 From: ${sender}\n\n${S.getMixedResponse()}`;
        }
    }

    if (c === 'joke') return `😈 ${S.random(JOKES)}\n\n${S.getMixedResponse()}`;
    if (c === 'truth') return `🎯 TRUTH\n${S.random(TRUTHS)}\n\n${S.getMixedResponse()}`;
    if (c === 'dare') return `🎯 DARE\n${S.random(DARES)}\n\n${S.getMixedResponse()}`;
    if (c === 'tod') return `🎯 ${Math.random() > 0.5 ? 'TRUTH' : 'DARE'}\n${Math.random() > 0.5 ? S.random(TRUTHS) : S.random(DARES)}`;
    if (c === '8ball') {
        const q = args.join(' ');
        if (!q) return `❌ ${P}8ball <question>`;
        return `🎱 ${S.random(EIGHTBALL)}`;
    }
    if (c === 'coinflip') return `🪙 ${Math.random() > 0.5 ? 'HEADS' : 'TAILS'}`;

    if (c === 'guess') {
        const n = parseInt(args[0]);
        if (!n || n < 1 || n > 100) return `🎮 ${P}guess <1-100>`;
        const secret = user._guessSecret || Math.floor(Math.random() * 100) + 1;
        user._guessSecret = secret;
        if (n === secret) {
            user._guessSecret = null;
            S.giveXS(sender, 50);
            return `🎯 CORRECT! +50 XS\n\n${S.getMixedResponse()}`;
        }
        return n < secret ? `📈 Higher!` : `📉 Lower!`;
    }

    if (c === 'play') {
        const song = args.join(' ').toLowerCase();
        if (!song) return `❌ ${P}play <song>`;
        try {
            await sock.sendMessage(groupId || sender, { react: { text: '🎵', key: msg.key } });
        } catch (e) {}

        let found = null;
        for (const key in AUDIO) {
            if (song.includes(key) || key.includes(song)) {
                found = { name: key, url: AUDIO[key] };
                break;
            }
        }

        if (found) {
            try {
                await sock.sendMessage(groupId || sender, {
                    audio: { url: found.url },
                    mimetype: 'audio/mp4',
                    ptt: false
                }, { quoted: msg });
                return null;
            } catch (e) {
                return `🎵 ${found.name}\n📥 ${found.url}`;
            }
        }

        return `🎵 SEARCH: ${song}\n▶️ https://www.youtube.com/results?search_query=${encodeURIComponent(song)}\n🎧 https://open.spotify.com/search/${encodeURIComponent(song)}\n\n${S.getMixedResponse()}`;
    }

    if (c === 'musiclist') {
        return `🎵 MUSIC LIBRARY\n${Object.keys(AUDIO).map((k, i) => `${i + 1}. ${k}`).join('\n')}\n\n💡 ${P}play <song>`;
    }

    // STICKERS
    if (c === 's') {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted?.imageMessage) return `❌ Reply to an image with ${P}s`;
        try {
            const stream = await sock.downloadMediaMessage({ message: quoted, key: msg.message.extendedTextMessage.contextInfo.stanzaId ? { remoteJid: msg.key.remoteJid, id: msg.message.extendedTextMessage.contextInfo.stanzaId, fromMe: false } : msg.key });
            await sock.sendMessage(groupId || sender, { sticker: stream }, { quoted: msg });
            return null;
        } catch (e) {
            console.error('Sticker:', e.message);
            return `❌ Sticker failed: ${e.message}`;
        }
    }

    if (c === 'st') {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted?.stickerMessage) return `❌ Reply to a sticker with ${P}st`;
        try {
            const stream = await sock.downloadMediaMessage({ message: quoted });
            await sock.sendMessage(groupId || sender, { image: stream, caption: "🖤" }, { quoted: msg });
            return null;
        } catch (e) {
            return `❌ ${e.message}`;
        }
    }

    return null;
}

module.exports = { handle };
