require('dotenv').config();
const express          = require('express');
const Stripe           = require('stripe');
const TelegramBot      = require('node-telegram-bot-api');
const QRCode           = require('qrcode');
const { createClient } = require('@supabase/supabase-js');

// Verify required environment variables
const requiredEnvVars = ['STRIPE_SECRET', 'STRIPE_PUB', 'TELEGRAM_BOT_TOKEN', 'SUPA_URL', 'SUPA_KEY', 'FRONTEND_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const app    = express();
const stripe = new Stripe(process.env.STRIPE_SECRET);
// Disable webhook for serverless
const bot    = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { webHook: true });
const supa   = createClient(process.env.SUPA_URL, process.env.SUPA_KEY);

app.use(express.json());
app.use(express.static('public'));

/* /start opens mini-app */
app.post('/bot/message', async (req, res) => {
  try {
    const { message } = req.body;
    if (message && message.text === '/start') {
      await bot.sendMessage(message.chat.id, 'Tap below to purchase.', {
        reply_markup: {
          inline_keyboard: [[{
            text: 'Open mini-app',
            web_app: { url: process.env.FRONTEND_URL }
          }]]
        }
      });
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling bot message:', error);
    res.sendStatus(500);
  }
});

/* 1 ─ create Checkout Session */
app.get('/api/create-checkout', async (req,res)=>{
  try {
    const tg = req.query.tgid;
    if(!tg) {
      return res.status(400).json({error:'tgid missing'});
    }
    
    // Get the host from the request
    const host = req.headers.origin || process.env.FRONTEND_URL;
    
    console.log('Creating checkout session for telegram_id:', tg);
    
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      ui_mode: 'embedded',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: 100,
          product_data: {
            name: 'Blaze panel'
          }
        },
        quantity: 1
      }],
      return_url: `${host}/paid.html?session_id={CHECKOUT_SESSION_ID}`,
      client_reference_id: tg
    });
    
    console.log('Checkout session created:', session.id);
    
    res.json({ 
      client_secret: session.client_secret,
      publishable_key: process.env.STRIPE_PUB
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: error.message 
    });
  }
});

// Helper function to send QR code
async function sendQRCode(telegramId) {
  try {
    console.log('📱 Sending QR code to telegram user:', telegramId);
    const qrBuffer = await QRCode.toBuffer(`appt-${Date.now()}-tg-${telegramId}`);
    await bot.sendPhoto(telegramId, qrBuffer, { caption: 'Show this QR at your blood draw.' });
    await bot.sendMessage(telegramId, '✅ Payment received – see you soon!');
    console.log('✅ QR code sent to user successfully');
  } catch (error) {
    console.error('❌ Error sending QR code:', error);
  }
}

// Process payment after successful checkout
app.post('/api/process-payment', async (req, res) => {
  try {
    const { session_id, telegram_id } = req.body;
    
    if (!session_id || !telegram_id) {
      return res.status(400).json({ error: 'session_id and telegram_id are required' });
    }
    
    console.log('Processing payment for session:', session_id, 'telegram_id:', telegram_id);
    
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status === 'paid') {
      // Process payment directly here
      const insertData = { 
        telegram_id: telegram_id, 
        status: 'paid',
        payment_id: session.payment_intent
      };
      console.log('💾 Attempting to insert payment data:', insertData);
      
      const { data, error } = await supa.from('payments').insert(insertData);
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      } else {
        console.log('✅ Payment record inserted:', data);
        await sendQRCode(telegram_id);
        res.json({ success: true, message: 'Payment processed successfully' });
      }
    } else {
      console.log('Payment not completed yet, status:', session.payment_status);
      res.status(400).json({ 
        success: false, 
        error: 'Payment not completed', 
        status: session.payment_status 
      });
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = app;

// Only start the server if we're not in a serverless environment
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;   // ← keep fallback for local dev
  app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  });
}

