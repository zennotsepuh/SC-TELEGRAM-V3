const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const api = require('./api');

const bot = new TelegramBot(config.BOT_TOKEN, { polling: true });

// ==== STATE SEMENTARA (multi-step) ====
const states = {};

// ==== HELPER FORMAT ====
const rp = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const esc = (s) => String(s || '').replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');

// ==== MENU UTAMA (INLINE KEYBOARD MEWAH) ====
function mainMenu() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '👤 Profil & Saldo', callback_data: 'menu_profile' },
                    { text: '🌍 Negara', callback_data: 'menu_countries' }
                ],
                [
                    { text: '💳 Deposit', callback_data: 'menu_deposit' },
                    { text: '📜 Riwayat Deposit', callback_data: 'menu_dephistory' }
                ],
                [
                    { text: '🛠️ Layanan', callback_data: 'menu_services' },
                    { text: '📡 Operator', callback_data: 'menu_operators' }
                ],
                [
                    { text: '🛒 Order Nokos', callback_data: 'menu_order' },
                    { text: '📦 Cek Status OTP', callback_data: 'menu_status' }
                ],
                [
                    { text: '📜 Riwayat Order', callback_data: 'menu_history' },
                    { text: '❌ Batal Order', callback_data: 'menu_cancel' }
                ],
                [
                    { text: '✨ Premium Support ✨', url: 'https://t.me/BotFather' }
                ]
            ]
        },
        parse_mode: 'MarkdownV2'
    };
}

// ==== HEADER MEWAH ====
const HEADER = `╔══════════════════════╗
║   💎 NOKOS PREMIUM 💎
║   _Fast • Aman • Murah_
╚══════════════════════╝`;

// ==== KIRIM MENU UTAMA ====
async function sendMainMenu(chatId, name = '') {
    const text =
`${HEADER}

👋 Selamat datang di dlouis kontol${name ? `, *${esc(name)}*` : ''}\\!\!

🌟 Silakan pilih menu di bawah yah kontol:

• 👤 Profil — Cek saldo & info akun
• 🌍 Negara — Daftar negara per server
• 💳 Deposit — Top up via QRIS
• 🛠️ Layanan — Daftar produk tersedia
• 📡 Operator — Operator seluler asli
• 🛒 Order — Beli nomor kosong
• 📦 Status — Cek OTP masuk
• 📜 Riwayat — Histori transaksi

💠 _Nikmati layanan premium kami\\!_`;

    await bot.sendMessage(chatId, text, mainMenu());
}

// ==== COMMAND /START ====
bot.onText(/\/start/, async (msg) => {
    await sendMainMenu(msg.chat.id, msg.from.first_name);
});

// ==== COMMAND /menu ====
bot.onText(/\/menu/, async (msg) => {
    await sendMainMenu(msg.chat.id, msg.from.first_name);
});

// ==== CALLBACK QUERY HANDLER ====
bot.on('callback_query', async (q) => {
    const chatId = q.message.chat.id;
    const data = q.data;
    const msgId = q.message.message_id;

    await bot.answerCallbackQuery(q.id);

    try {
        // ===== PROFIL =====
        if (data === 'menu_profile') {
            const p = await api.getProfile();
            const text =
`${HEADER}

👤 PROFIL AKUN NIH SAYANG

╭─────────────────
│ 📧 Email : \`${esc(p.email || '-')}\`
│ 🏷️ Nama  : *${esc(p.name || '-')}*
│ 💰 Saldo : *${esc(rp(p.balance))}*
╰─────────────────

💎 _Akun terverifikasi & aman_`;

            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'menu_back' }]]
                }
            });
        }

        // ===== MENU NEGARA =====
        if (data === 'menu_countries') {
            const text =
`${HEADER}

🌍 DAFTAR NEGARA SAYANG

╭─────────────────
│ Pilih server untuk
│ melihat daftar negara:
╰─────────────────

📌 *Server 1\\-3* → Kode angka \\(contoh: 6\\)
📌 *Server 4* → Kode ISO \\(contoh: id\\)`;

            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🔢 Server 1', callback_data: 'countries_1' },
                            { text: '🔢 Server 2', callback_data: 'countries_2' }
                        ],
                        [
                            { text: '🔢 Server 3', callback_data: 'countries_3' },
                            { text: '🌐 Server 4 \\(ISO\\)', callback_data: 'countries_4' }
                        ],
                        [{ text: '🔙 Kembali', callback_data: 'menu_back' }]
                    ]
                }
            });
        }

        if (data.startsWith('countries_')) {
            const server = data.split('_')[1];
            const res = await api.getCountries(server);
            const list = Array.isArray(res) ? res : (res.data || res.result || []);

            let out = `${HEADER}\n\n🌍 *NEGARA — SERVER ${esc(server)}*\n\n`;
            if (!list.length) out += '_Tidak ada data_';
            else {
                list.slice(0, config.LIMIT).forEach((c, i) => {
                    const code = c.code || c.id || c.country || '-';
                    const name = c.name || c.country_name || c.nama || '-';
                    out += `\`${String(i + 1).padStart(2, '0')}\\.\` \\[${esc(code)}\\] ${esc(name)}\n`;
                });
            }

            await bot.editMessageText(out, {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'menu_countries' }]]
                }
            });
        }

        // ===== MENU DEPOSIT =====
        if (data === 'menu_deposit') {
            const text =
`${HEADER}

💳 DEPOSIT SALDO DULU ANJ

╭─────────────────
│ Top up saldo via QRIS
│ Proses otomatis 24 jam
╰─────────────────

📝 *Cara deposit:*
Ketik perintah berikut:

\`/deposit <nominal>\`

Contoh:
\`/deposit 10000\`

💎 _Minimal deposit Rp 1\\.000_`;

            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '💵 10rb', callback_data: 'dep_10000' },
                            { text: '💵 25rb', callback_data: 'dep_25000' }
                        ],
                        [
                            { text: '💵 50rb', callback_data: 'dep_50000' },
                            { text: '💵 100rb', callback_data: 'dep_100000' }
                        ],
                        [{ text: '🔙 Kembali', callback_data: 'menu_back' }]
                    ]
                }
            });
        }

        if (data.startsWith('dep_')) {
            const nominal = data.split('_')[1];
            const d = await api.createDeposit(nominal);
            const id = d.id || d.deposit_id;
            const qr = d.qr || d.qr_data || d.qris || '-';

            const text =
`${HEADER}

✅ DEPOSIT DIBUAT NIH KONTOL

╭─────────────────
│ 🆔 ID      : \`${esc(id)}\`
│ 💵 Nominal : *${esc(rp(nominal))}*
│ 📌 Status  : *PENDING*
╰─────────────────

${qr !== '-' ? `📷 *QRIS:*\n\`${esc(qr)}\`\n\n` : ''}⏳ _Selesaikan pembayaran dalam 15 menit_

Cek status: \`/depstatus ${esc(id)}\``;

            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔄 Cek Status', callback_data: `deps_${id}` }],
                        [{ text: '❌ Batalkan', callback_data: `depc_${id}` }],
                        [{ text: '🔙 Kembali', callback_data: 'menu_deposit' }]
                    ]
                }
            });
        }

        if (data.startsWith('deps_')) {
            const id = data.replace('deps_', '');
            const d = await api.depositStatus(id);
            const text =
`${HEADER}

📊 STATUS DEPOSIT KONTOL

╭─────────────────
│ 🆔 ID      : \`${esc(id)}\`
│ 💵 Nominal : *${esc(rp(d.nominal || d.amount))}*
│ 📌 Status  : *${esc((d.status || '-').toUpperCase())}*
╰─────────────────`;

            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'menu_deposit' }]]
                }
            });
        }

        if (data.startsWith('depc_')) {
            const id = data.replace('depc_', '');
            await api.depositCancel(id);
            await bot.editMessageText(
`${HEADER}\n\n✅ *Deposit dibatalkan*\n🆔 \`${esc(id)}\``,
                {
                    chat_id: chatId,
                    message_id: msgId,
                    parse_mode: 'MarkdownV2',
                    reply_markup: {
                        inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'menu_deposit' }]]
                    }
                }
            );
        }

        // ===== RIWAYAT DEPOSIT =====
        if (data === 'menu_dephistory') {
            const res = await api.depositHistory(20);
            const list = Array.isArray(res) ? res : (res.data || res.history || []);

            let out = `${HEADER}\n\n📜 *RIWAYAT DEPOSIT*\n\n`;
            if (!list.length) out += '_Belum ada riwayat_';
            else {
                list.slice(0, 10).forEach((d, i) => {
                    out += `*${i + 1}\\.* ${esc(rp(d.nominal || d.amount))} — *${esc((d.status || '').toUpperCase())}*\n`;
                    out += `     \\| ID: \`${esc(d.id)}\`\n\n`;
                });
            }

            await bot.editMessageText(out, {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'menu_back' }]]
                }
            });
        }

        // ===== MENU SERVICES =====
        if (data === 'menu_services') {
            const text =
`${HEADER}

🛠️ DAFTAR LAYANAN SAYANG

📝 Format: \`/services <server> <negara>\`

Contoh:
\`/services 1 6\`

📌 Server 2 & 4 pakai *provider* untuk pilih varian\\.`;

            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'menu_back' }]]
                }
            });
        }

        // ===== MENU OPERATORS =====
        if (data === 'menu_operators') {
            const text =
`${HEADER}

📡 DAFTAR OPERATOR JEMBOT

📝 Format: \`/operators <server> <negara>\`

Contoh:
\`/operators 1 6\`

📌 *Server 1 & 4* mendukung operator asli\\.
📌 \`any\` = Random Operator`;

            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'menu_back' }]]
                }
            });
        }

        // ===== MENU ORDER =====
        if (data === 'menu_order') {
            const text =
`${HEADER}

🛒 ORDER NOKOS KONTOL

╭─────────────────
│ Pilih server sesuai
│ kebutuhan lu\\:
╰─────────────────

*Server 1* — \`/order 1 6 wa any\`
*Server 2* — \`/order 2 6 wa 3320\`
*Server 3* — \`/order 3 6 wa\`
*Server 4* — \`/order 4 id tw 532\`

📝 Format:
\`/order <server> <negara> <produk> [operator|provider]\`

💎 _Saldo terpotong otomatis_`;

            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'menu_back' }]]
                }
            });
        }

        // ===== MENU STATUS =====
        if (data === 'menu_status') {
            const text =
`${HEADER}

📦 CEK STATUS & OTP LAH PEPEK

📝 Format: \`/status <order_id>\`

Contoh:
\`/status 8aa46f60\\-4d26\\-4e72\\-b784\\-6ee3f087b817\``;

            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'menu_back' }]]
                }
            });
        }

        // ===== MENU CANCEL =====
        if (data === 'menu_cancel') {
            const text =
`${HEADER}

❌ BATAL ORDER KONTOL EMANG

📝 Format: \`/cancel <order_id>\`

💎 _Saldo otomatis direfund_`;

            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'menu_back' }]]
                }
            });
        }

        // ===== RIWAYAT ORDER =====
        if (data === 'menu_history') {
            const res = await api.orderHistory(20);
            const list = Array.isArray(res) ? res : (res.data || res.history || []);

            let out = `${HEADER}\n\n📜 *RIWAYAT ORDER*\n\n`;
            if (!list.length) out += '_Belum ada riwayat_';
            else {
                list.slice(0, 10).forEach((o, i) => {
                    out += `*${i + 1}\\.* \`${esc(o.number || '-')}\`\n`;
                    out += `     Status: *${esc((o.status || '').toUpperCase())}*\n`;
                    out += `     OTP: \`${esc(o.otp || 'Waiting')}\`\n`;
                    out += `     Harga: ${esc(rp(o.price))}\n\n`;
                });
            }

            await bot.editMessageText(out, {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'menu_back' }]]
                }
            });
        }

        // ===== KEMBALI =====
        if (data === 'menu_back') {
            await bot.editMessageText(
`${HEADER}\n\n🌟 *Silakan pilih menu:*`,
                {
                    chat_id: chatId,
                    message_id: msgId,
                    parse_mode: 'MarkdownV2',
                    ...mainMenu()
                }
            );
        }

    } catch (e) {
        console.error('Callback error:', e.message);
        await bot.sendMessage(chatId, `❌ *Error:* \`${esc(e.response?.data?.message || e.message)}\``, {
            parse_mode: 'MarkdownV2'
        });
    }
});

// ==== COMMAND TEXT HANDLER ====
bot.on('message', async (msg) => {
    const text = msg.text || '';
    const chatId = msg.chat.id;

    if (!text.startsWith('/')) return;
    const [cmd, ...args] = text.slice(1).split(/\s+/);

    try {
        // ===== /profile =====
        if (cmd === 'profile' || cmd === 'me') {
            const p = await api.getProfile();
            const out =
`${HEADER}

👤 PROFIL AKUN JEMBOT

╭─────────────────
│ 📧 Email : \`${esc(p.email || '-')}\`
│ 🏷️ Nama  : *${esc(p.name || '-')}*
│ 💰 Saldo : *${esc(rp(p.balance))}*
╰─────────────────`;

            return bot.sendMessage(chatId, out, {
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: [[{ text: '🔙 Menu Utama', callback_data: 'menu_back' }]]
                }
            });
        }

        // ===== /countries =====
        if (cmd === 'countries') {
            const server = args[0];
            if (!server) return bot.sendMessage(chatId, '❌ Format: `/countries 1`', { parse_mode: 'MarkdownV2' });

            const res = await api.getCountries(server);
            const list = Array.isArray(res) ? res : (res.data || res.result || []);

            let out = `${HEADER}\n\n🌍 *NEGARA — SERVER ${esc(server)}*\n\n`;
            list.slice(0, config.LIMIT).forEach((c, i) => {
                const code = c.code || c.id || c.country || '-';
                const name = c.name || c.country_name || c.nama || '-';
                out += `\`${String(i + 1).padStart(2, '0')}\\.\` \\[${esc(code)}\\] ${esc(name)}\n`;
            });

            return bot.sendMessage(chatId, out, { parse_mode: 'MarkdownV2' });
        }

        // ===== /deposit =====
        if (cmd === 'deposit') {
            const nominal = args[0];
            const code = args[1];
            if (!nominal) return bot.sendMessage(chatId, '❌ Format: `/deposit 10000`', { parse_mode: 'MarkdownV2' });

            const d = await api.createDeposit(nominal, code);
            const id = d.id || d.deposit_id;
            const qr = d.qr || d.qr_data || d.qris || '-';

            const out =
`${HEADER}

✅ DEPOSIT DIBUAT KIMAK

╭─────────────────
│ 🆔 ID      : \`${esc(id)}\`
│ 💵 Nominal : *${esc(rp(nominal))}*
│ 📌 Status  : *PENDING*
╰─────────────────

${qr !== '-' ? `📷 *QRIS:*\n\`${esc(qr)}\`\n\n` : ''}Cek status: \`/depstatus ${esc(id)}\``;

            return bot.sendMessage(chatId, out, { parse_mode: 'MarkdownV2' });
        }

        // ===== /depstatus =====
        if (cmd === 'depstatus') {
            const id = args[0];
            if (!id) return bot.sendMessage(chatId, '❌ Format: `/depstatus <id>`', { parse_mode: 'MarkdownV2' });

            const d = await api.depositStatus(id);
            const out =
`${HEADER}

📊 STATUS DEPOSIT LU KIMAK

╭─────────────────
│ 🆔 ID      : \`${esc(id)}\`
│ 💵 Nominal : *${esc(rp(d.nominal || d.amount))}*
│ 📌 Status  : *${esc((d.status || '-').toUpperCase())}*
╰─────────────────`;

            return bot.sendMessage(chatId, out, { parse_mode: 'MarkdownV2' });
        }

        // ===== /depcancel =====
        if (cmd === 'depcancel') {
            const id = args[0];
            if (!id) return bot.sendMessage(chatId, '❌ Format: `/depcancel <id>`', { parse_mode: 'MarkdownV2' });
            await api.depositCancel(id);
            return bot.sendMessage(chatId, `✅ Deposit \`${esc(id)}\` dibatalkan\\.`, { parse_mode: 'MarkdownV2' });
        }

        // ===== /dephistory =====
        if (cmd === 'dephistory') {
            const status = args[0];
            const res = await api.depositHistory(20, status);
            const list = Array.isArray(res) ? res : (res.data || res.history || []);

            let out = `${HEADER}\n\n📜 *RIWAYAT DEPOSIT*\n\n`;
            list.slice(0, 10).forEach((d, i) => {
                out += `*${i + 1}\\.* ${esc(rp(d.nominal || d.amount))} — *${esc((d.status || '').toUpperCase())}*\n`;
                out += `     \\| \`${esc(d.id)}\`\n\n`;
            });

            return bot.sendMessage(chatId, out, { parse_mode: 'MarkdownV2' });
        }

        // ===== /services =====
        if (cmd === 'services') {
            const [server, country] = args;
            if (!server || !country) return bot.sendMessage(chatId, '❌ Format: `/services 1 6`', { parse_mode: 'MarkdownV2' });

            const res = await api.getServices(server, country);
            const list = Array.isArray(res) ? res : (res.data || res.services || []);

            let out = `${HEADER}\n\n🛠️ *LAYANAN — SERVER ${esc(server)} / NEGARA ${esc(country)}*\n\n`;
            list.slice(0, config.LIMIT).forEach((s, i) => {
                const kode = s.produk || s.code || s.id || '-';
                const nama = s.name || s.nama || s.service_name || '-';
                const prov = s.provider ? ` \\| prov: \`${esc(s.provider)}\`` : '';
                const harga = (s.price || s.harga) ? ` \\| ${esc(rp(s.price || s.harga))}` : '';
                out += `\`${String(i + 1).padStart(2, '0')}\\.\` \\[${esc(kode)}\\] ${esc(nama)}${prov}${harga}\n`;
            });

            return bot.sendMessage(chatId, out, { parse_mode: 'MarkdownV2' });
        }

        // ===== /operators =====
        if (cmd === 'operators') {
            const [server, country] = args;
            if (!server || !country) return bot.sendMessage(chatId, '❌ Format: `/operators 1 6`', { parse_mode: 'MarkdownV2' });

            const res = await api.getOperators(server, country);
            const list = Array.isArray(res) ? res : (res.data || res.operators || []);

            let out = `${HEADER}\n\n📡 *OPERATOR — SERVER ${esc(server)} / NEGARA ${esc(country)}*\n\n`;
            out += `\`00\\.\` \\[any\\] Random Operator\n`;
            list.forEach((o, i) => {
                const kode = o.operator || o.code || o.id || '-';
                const nama = o.name || o.nama || '-';
                out += `\`${String(i + 1).padStart(2, '0')}\\.\` \\[${esc(kode)}\\] ${esc(nama)}\n`;
            });

            return bot.sendMessage(chatId, out, { parse_mode: 'MarkdownV2' });
        }

        // ===== /status =====
        if (cmd === 'status') {
            const id = args[0];
            if (!id) return bot.sendMessage(chatId, '❌ Format: `/status <id>`', { parse_mode: 'MarkdownV2' });

            const o = await api.orderStatus(id);
            const out =
`${HEADER}

📦 STATUS ORDER NI ANJ

╭─────────────────
│ 🆔 ID     : \`${esc(id)}\`
│ 📱 Nomor  : \`${esc(o.number || '-')}\`
│ 🔑 OTP    : \`${esc(o.otp || 'Waiting')}\`
│ 📌 Status : *${esc((o.status || '-').toUpperCase())}*
│ 💵 Harga  : ${esc(rp(o.price))}
╰─────────────────`;

            return bot.sendMessage(chatId, out, { parse_mode: 'MarkdownV2' });
        }

        // ===== /cancel =====
        if (cmd === 'cancel') {
            const id = args[0];
            if (!id) return bot.sendMessage(chatId, '❌ Format: `/cancel <id>`', { parse_mode: 'MarkdownV2' });
            await api.orderCancel(id);
            return bot.sendMessage(chatId, `✅ Order \`${esc(id)}\` dibatalkan\\. Saldo direfund\\.`, { parse_mode: 'MarkdownV2' });
        }

        // ===== /history =====
        if (cmd === 'history') {
            const res = await api.orderHistory(20);
            const list = Array.isArray(res) ? res : (res.data || res.history || []);

            let out = `${HEADER}\n\n📜 *RIWAYAT ORDER*\n\n`;
            list.slice(0, 10).forEach((o, i) => {
                out += `*${i + 1}\\.* \`${esc(o.number || '-')}\`\n`;
                out += `     Status: *${esc((o.status || '').toUpperCase())}*\n`;
                out += `     OTP: \`${esc(o.otp || 'Waiting')}\`\n`;
                out += `     Harga: ${esc(rp(o.price))}\n\n`;
            });

            return bot.sendMessage(chatId, out, { parse_mode: 'MarkdownV2' });
        }

        // ===== /order =====
        if (cmd === 'order') {
            const [server, country, produk, extra] = args;
            if (!server || !country || !produk)
                return bot.sendMessage(chatId,
`${HEADER}

❌ Format salah pepek\\!

📝 Contoh:
• \`/order 1 6 wa any\`
• \`/order 2 6 wa 3320\`
• \`/order 3 6 wa\`
• \`/order 4 id tw 532\``,
                { parse_mode: 'MarkdownV2' });

            const s = parseInt(server);
            const payload = { server: s, country, produk };

            if (s === 1) payload.operator = extra || 'any';
            else if (s === 2 || s === 4) {
                if (!extra) return bot.sendMessage(chatId, `❌ Server ${s} butuh provider\\.`, { parse_mode: 'MarkdownV2' });
                payload.provider = extra;
            }

            const o = await api.createOrder(payload);
            const out =
`${HEADER}

✅ ORDER BERHASIL KONTOL

╭─────────────────
│ 🆔 ID     : \`${esc(o.id)}\`
│ 🌍 Negara : ${esc(o.country_name || country)}
│ 📱 Nomor  : \`${esc(o.number)}\`
│ 💵 Harga  : ${esc(rp(o.price))}
│ 📌 Status : *${esc((o.status || 'PENDING').toUpperCase())}*
│ 🔑 OTP    : \`${esc(o.otp || 'Waiting')}\`
╰─────────────────

📦 Cek OTP: \`/status ${esc(o.id)}\`
❌ Batal  : \`/cancel ${esc(o.id)}\``;

            return bot.sendMessage(chatId, out, {
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔄 Refresh Status', callback_data: `menu_status` }],
                        [{ text: '🔙 Menu Utama', callback_data: 'menu_back' }]
                    ]
                }
            });
        }

        // Command gak dikenal
        await bot.sendMessage(chatId,
`${HEADER}

❓ *Command gak dikenal*

Ketik /menu untuk lihat daftar perintah\\.`,
            { parse_mode: 'MarkdownV2' });

    } catch (e) {
        console.error('Error:', e.message);
        await bot.sendMessage(chatId,
            `❌ *Error:* \`${esc(e.response?.data?.message || e.message)}\``,
            { parse_mode: 'MarkdownV2' }
        );
    }
});

// ==== STARTUP LOG ====
console.log(`
╔══════════════════════════════╗
║  💎 NOKOS TELEGRAM BOT 💎    ║
║  ✅ Bot berjalan...          ║
╚══════════════════════════════╝
`);
