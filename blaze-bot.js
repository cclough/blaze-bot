require('dotenv').config();
const TelegramBot      = require('node-telegram-bot-api');
const express          = require('express');
const QRCode           = require('qrcode');
const { createClient } = require('@supabase/supabase-js');

const app       = express();
const bot       = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const supa      = createClient(process.env.SUPA_URL, process.env.SUPA_KEY);
const FRONTEND  = process.env.FRONTEND_URL;            // e.g. https://blaze.vercel.app
const PAY_LINK  = process.env.STRIPE_LINK;             // buy.stripe.com/...

// 1️⃣  /start → open Web-App
bot.onText(/\/start/, msg => {
  bot.sendMessage(msg.chat.id, 'Welcome to Blaze Inflammation Test', {
    reply_markup: {
      inline_keyboard: [[{
        text: 'Open WebApp',
        web_app: { url: `${FRONTEND}/index.html` }
      }]]
    }
  });
});

// 2️⃣  Web-App callback (success.html → sendData)
bot.on('message', async msg => {
  if (!msg.web_app_data) return;                       // ignore normal messages
  const { status } = JSON.parse(msg.web_app_data.data);

  if (status === 'paid') {
    // ➜ store payment row
    await supa.from('payments').insert({
      telegram_id: msg.chat.id,
      status:      'paid'
    });

    // ➜ generate QR & send
    const qrString = `appt-${Date.now()}-tg-${msg.chat.id}`;
    const qrUrl    = await QRCode.toDataURL(qrString);
    await bot.sendPhoto(msg.chat.id, { url: qrUrl },
      { caption: 'Show this QR at your blood-draw appointment.' });

    await bot.sendMessage(msg.chat.id, '✅ Payment stored.  See you soon!');
  }
});

// (optional) serve static success.html / index.html
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server listening on', PORT));