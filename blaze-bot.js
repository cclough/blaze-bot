require('dotenv').config();
const express          = require('express');
const Stripe           = require('stripe');
const TelegramBot      = require('node-telegram-bot-api');
const QRCode           = require('qrcode');
const cors             = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Verify required environment variables
const requiredEnvVars = ['STRIPE_SECRET', 'STRIPE_PUB', 'TELEGRAM_BOT_TOKEN', 'SUPA_URL', 'SUPA_KEY'];
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

app.use(cors({ 
  origin: ['https://blaze-bot-five.vercel.app', 'https://blaze-lrdtpaldh-christian-cloughs-projects.vercel.app'],
  methods: ['GET', 'POST'],
  credentials: true
}));

// Apply raw body parser to webhook route BEFORE json parser
app.use('/stripe-webhook', express.raw({type: 'application/json'}));

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
            web_app: { url: 'https://blaze-bot-five.vercel.app' }
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
    const host = req.headers.origin || 'https://blaze-bot-five.vercel.app';
    
    console.log('Creating checkout session for telegram_id:', tg);
    
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      ui_mode: 'embedded',
      payment_method_types: ['card', 'apple_pay', 'google_pay', 'link'],
      payment_method_options: {
        card: {
          setup_future_usage: 'off_session'
        }
      },
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
      client_reference_id: tg,
      metadata: { 
        telegram_id: tg,
        origin: host
      },
      payment_intent_data: {
        metadata: { 
          telegram_id: tg,
          origin: host
        },
        setup_future_usage: 'off_session'
      }
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

/* 2 ─ Stripe webhook */
app.post('/stripe-webhook', async (req,res)=>{
  const sig = req.headers['stripe-signature'];
  console.log('Received webhook call with signature:', sig);

  try {
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WHSEC
      );
    } catch(e) { 
      console.error('Webhook signature verification failed:', e);
      return res.status(400).send(`Webhook Error: ${e.message}`); 
    }
    
    console.log('Received webhook event:', event.type, 'with ID:', event.id);
    
    // Only handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const tg = session.metadata.telegram_id || session.client_reference_id;
      console.log('Checkout session completed for telegram_id:', tg);
      
      if (tg) {
        try {
          const insertData = { 
            telegram_id: tg, 
            status: 'paid',
            amount: session.amount_total,
            payment_id: session.payment_intent,
            checkout_id: session.id
          };
          console.log('Attempting to insert checkout data:', insertData);
          
          const { data, error } = await supa.from('payments').insert(insertData);
          if (error) {
            console.error('Supabase error:', error);
          } else {
            console.log('Payment record inserted:', data);
            
            // Only send QR code after successful database insert
            const qrBuffer = await QRCode.toBuffer(`appt-${Date.now()}-tg-${tg}`);
            await bot.sendPhoto(tg, qrBuffer, { caption: 'Show this QR at your blood draw.' });
            await bot.sendMessage(tg, '✅ Payment received – see you soon!');
            console.log('QR code sent to user');
          }
        } catch (error) {
          console.error('Error processing checkout completion:', error);
        }
      } else {
        console.error('No telegram_id found in session metadata or client_reference_id');
      }
    } else {
      console.log('Ignoring non-checkout event:', event.type);
    }

    res.json({received: true, type: event.type});
  } catch (error) {
    console.error('Webhook handling error:', error);
    res.status(500).send(`Webhook Error: ${error.message}`);
  }
});

// Add a test endpoint to verify the server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

module.exports = app;

// Only start the server if we're not in a serverless environment
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;   // ← keep fallback for local dev
  app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  });
}

