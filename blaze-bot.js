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
        }
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
  console.log('=== WEBHOOK RECEIVED ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body length:', req.body ? req.body.length : 'No body');
  console.log('Signature present:', !!sig);

  try {
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WHSEC
      );
      console.log('✅ Webhook signature verified successfully');
    } catch(e) { 
      console.error('❌ Webhook signature verification failed:', e.message);
      return res.status(400).send(`Webhook Error: ${e.message}`); 
    }
    
    console.log('📨 Received webhook event:', event.type, 'with ID:', event.id);
    console.log('Event data keys:', Object.keys(event.data.object));
    
    // Handle both checkout.session.completed and payment_intent.succeeded
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const tg = session.metadata.telegram_id || session.client_reference_id;
      console.log('💳 Checkout session completed for telegram_id:', tg);
      console.log('Session metadata:', session.metadata);
      console.log('Session client_reference_id:', session.client_reference_id);
      
      if (tg) {
        await processPayment(tg, session.amount_total, session.payment_intent, session.id, 'checkout_session');
      } else {
        console.error('❌ No telegram_id found in session metadata or client_reference_id');
        console.log('Available session data:', JSON.stringify(session, null, 2));
      }
    } else if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const tg = paymentIntent.metadata.telegram_id;
      console.log('💰 Payment intent succeeded for telegram_id:', tg);
      console.log('Payment intent metadata:', paymentIntent.metadata);
      
      if (tg) {
        await processPayment(tg, paymentIntent.amount, paymentIntent.id, null, 'payment_intent');
      } else {
        console.error('❌ No telegram_id found in payment intent metadata');
        console.log('Available payment intent data:', JSON.stringify(paymentIntent, null, 2));
      }
    } else {
      console.log('ℹ️ Ignoring event:', event.type);
    }

    console.log('=== WEBHOOK PROCESSING COMPLETE ===');
    res.json({received: true, type: event.type, processed: true});
  } catch (error) {
    console.error('❌ Webhook handling error:', error);
    res.status(500).send(`Webhook Error: ${error.message}`);
  }
});

// Helper function to process payment
async function processPayment(telegramId, amount, paymentId, checkoutId, source) {
  try {
    // Only include columns that exist in your Supabase table
    const insertData = { 
      telegram_id: telegramId, 
      status: 'paid',
      payment_id: paymentId,
      checkout_id: checkoutId
      // Removed amount and source columns as they don't exist in the table
    };
    console.log(`💾 Attempting to insert ${source} data:`, insertData);
    
    const { data, error } = await supa.from('payments').insert(insertData);
    if (error) {
      console.error('❌ Supabase error:', error);
      
      // If there's still a column error, try with minimal data
      if (error.code === 'PGRST204' || error.message.includes('column')) {
        console.log('🔄 Retrying with minimal data...');
        const minimalData = { 
          telegram_id: telegramId, 
          status: 'paid'
        };
        const { data: retryData, error: retryError } = await supa.from('payments').insert(minimalData);
        if (retryError) {
          console.error('❌ Retry also failed:', retryError);
        } else {
          console.log('✅ Payment record inserted with minimal data:', retryData);
          await sendQRCode(telegramId);
        }
      }
    } else {
      console.log('✅ Payment record inserted:', data);
      await sendQRCode(telegramId);
    }
  } catch (error) {
    console.error(`❌ Error processing ${source}:`, error);
  }
}

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

// Add a test endpoint to verify the server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add manual trigger for testing payment processing
app.post('/api/manual-process-payment', async (req, res) => {
  try {
    const { session_id, telegram_id } = req.body;
    
    if (!session_id || !telegram_id) {
      return res.status(400).json({ error: 'session_id and telegram_id are required' });
    }
    
    console.log('Manual payment processing for session:', session_id, 'telegram_id:', telegram_id);
    
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status === 'paid') {
      await processPayment(telegram_id, session.amount_total, session.payment_intent, session.id, 'manual_trigger');
      res.json({ success: true, message: 'Payment processed manually' });
    } else {
      res.status(400).json({ error: 'Session is not paid', status: session.payment_status });
    }
  } catch (error) {
    console.error('Manual processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add endpoint to get session status
app.get('/api/session-status', async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    console.log('Retrieving session status for:', sessionId);
    
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent']
    });
    
    console.log('=== SESSION STATUS DEBUG ===');
    console.log('Session ID:', session.id);
    console.log('Session status:', session.status);
    console.log('Payment status:', session.payment_status);
    console.log('Session metadata:', session.metadata);
    console.log('Client reference ID:', session.client_reference_id);
    console.log('Payment intent ID:', session.payment_intent?.id);
    console.log('Payment intent status:', session.payment_intent?.status);
    console.log('Payment intent metadata:', session.payment_intent?.metadata);
    console.log('=== END SESSION DEBUG ===');
    
    res.json({
      status: session.status,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email,
      amount_total: session.amount_total,
      session_id: session.id,
      payment_intent_id: session.payment_intent?.id,
      payment_intent_status: session.payment_intent?.status
    });
  } catch (error) {
    console.error('Error retrieving session:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve session status',
      message: error.message 
    });
  }
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

