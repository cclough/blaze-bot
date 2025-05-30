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

/* 1 ─ create Checkout Session with form data */
app.post('/api/create-checkout', async (req, res) => {
  try {
    const tg = req.query.tgid;
    if (!tg) {
      return res.status(400).json({ error: 'tgid missing' });
    }
    
    // Extract form data from request body
    const { age, gender, height, weight, units_preference, waivers_accepted } = req.body;
    
    // Get the host from the request
    const host = req.headers.origin || process.env.FRONTEND_URL;
    
    console.log('Creating checkout session for telegram_id:', tg);
    console.log('Form data received:', { age, gender, height, weight, units_preference, waivers_accepted });
    
    // First, store the user data in the database
    const userData = {
      telegram_id: parseInt(tg),
      age: age ? parseInt(age) : null,
      gender: gender || null,
      height_cm: height ? parseInt(height) : null, // Always in cm
      weight_kg: weight ? parseInt(weight) : null, // Always in kg
      units_preference: units_preference || 'imperial',
      waivers_accepted: waivers_accepted === 'true',
      amount: 100, // $1.00 in cents
      currency: 'usd',
      status: 'pending' // Will be updated to 'paid' after successful payment
    };
    
    console.log('💾 Attempting to insert user data:', userData);
    
    // Insert user data and get the inserted record
    const { data: insertedData, error } = await supa
      .from('payments')
      .insert(userData)
      .select('id')
      .single();
    
    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ 
        error: 'Failed to store user data',
        message: error.message 
      });
    }
    
    console.log('✅ User data stored successfully with ID:', insertedData.id);
    
    // Create Stripe checkout session
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
    
    // Update the specific record with the Stripe session ID using the record ID
    const { error: updateError } = await supa
      .from('payments')
      .update({ stripe_session_id: session.id })
      .eq('id', insertedData.id);
    
    if (updateError) {
      console.error('❌ Error updating stripe_session_id:', updateError);
    } else {
      console.log('✅ Stripe session ID updated successfully for record ID:', insertedData.id);
    }
    
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

// Keep the old GET endpoint for backward compatibility
app.get('/api/create-checkout', async (req, res) => {
  try {
    const tg = req.query.tgid;
    if (!tg) {
      return res.status(400).json({ error: 'tgid missing' });
    }
    
    // Get the host from the request
    const host = req.headers.origin || process.env.FRONTEND_URL;
    
    console.log('Creating checkout session (legacy) for telegram_id:', tg);
    
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
      // Update the existing record's status to 'paid' and ensure stripe_session_id is saved
      const { data, error } = await supa
        .from('payments')
        .update({ 
          status: 'paid',
          stripe_session_id: session_id // Ensure the session ID is saved
        })
        .eq('telegram_id', parseInt(telegram_id))
        .eq('status', 'pending') // Only update pending records
        .order('created_at', { ascending: false }) // Get the most recent one
        .limit(1);
      
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      } else {
        console.log('✅ Payment status updated to paid with session ID:', data);
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

// Helper function to send QR code
async function sendQRCode(telegramId) {
  try {
    console.log('📱 Sending QR code to telegram user:', telegramId);
    const qrBuffer = await QRCode.toBuffer(`appt-${Date.now()}-tg-${telegramId}`);
    await bot.sendMessage(telegramId, '✅ Payment received');
    // Add a small delay before sending QR code
    await new Promise(resolve => setTimeout(resolve, 3000));
    await bot.sendPhoto(telegramId, qrBuffer, { caption: 'Show this QR at your blood draw. See you soon!' });
    // await new Promise(resolve => setTimeout(resolve, 3000));
    // await bot.sendMessage(telegramId, 'View your results:', {
    //   reply_markup: {
    //     inline_keyboard: [[
    //       {
    //         text: '🔬 View Results',
    //         web_app: { url: `${process.env.FRONTEND_URL}/results.html` }
    //       }
    //     ]]
    //   }
    // });
    console.log('✅ QR code sent to user successfully');
  } catch (error) {
    console.error('❌ Error sending QR code:', error);
  }
}

module.exports = app;

// Only start the server if we're not in a serverless environment
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;   // ← keep fallback for local dev
  app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  });
}

