// === telegram_test_bot.js ===
// Basic Telegram Bot + WebApp + Stripe Link + QR + Result Viewer

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const QRCode = require('qrcode');
const app = express();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const STRIPE_CHECKOUT_LINK = process.env.STRIPE_LINK;
const FRONTEND_URL = process.env.FRONTEND_URL;

const bot = new TelegramBot(TOKEN, { polling: true });
const db = new Map(); // Replace with Firebase/MongoDB later

app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from public directory

// ===== 1. Telegram Bot Logic =====
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Welcome to the Cytokine Blood Test Mini-App!', {
    reply_markup: {
      inline_keyboard: [[{
        text: 'Open WebApp',
        web_app: { url: `${FRONTEND_URL}/index.html?tgid=${chatId}` }
      }]]
    }
  });
});

// After user taps "Buy Test" on WebApp
app.post('/api/webapp-complete', async (req, res) => {
  const { telegramId } = req.body;
  console.log('Received webapp-complete request for telegramId:', telegramId);
  
  if (!telegramId) {
    console.error('No telegramId provided');
    return res.status(400).json({ error: 'telegramId is required' });
  }
  
  try {
    await bot.sendMessage(telegramId, `Great! Tap below to pay.`, {
      reply_markup: {
        inline_keyboard: [[{
          text: 'Pay via Stripe',
          url: STRIPE_CHECKOUT_LINK
        }]]
      }
    });
    console.log('Successfully sent payment message to:', telegramId);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mock Stripe webhook to confirm payment
app.post('/api/stripe-paid', async (req, res) => {
  const { telegramId } = req.body;
  const qrData = `appt-${Date.now()}-tg-${telegramId}`;
  const qrUrl = await QRCode.toDataURL(qrData);
  db.set(telegramId, { paid: true, qr: qrUrl });
  bot.sendPhoto(telegramId, qrUrl, { caption: 'Show this QR code at your appointment.' });
  res.sendStatus(200);
});

// Admin uploads result
app.post('/api/upload-result', (req, res) => {
  const { telegramId, resultUrl } = req.body;
  const user = db.get(telegramId);
  if (user) {
    user.result = resultUrl;
    bot.sendMessage(telegramId, 'Your results are ready. Tap below to view.', {
      reply_markup: {
        inline_keyboard: [[{
          text: 'View Results',
          web_app: { url: `${FRONTEND_URL}/results?tgid=${telegramId}` }
        }]]
      }
    });
    res.sendStatus(200);
  } else {
    res.status(404).send('User not found');
  }
});

// ===== 2. Express Server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
