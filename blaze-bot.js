require('dotenv').config();
const express          = require('express');
const Stripe           = require('stripe');
const TelegramBot      = require('node-telegram-bot-api');
const QRCode           = require('qrcode');
const cors             = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app    = express();
const stripe = new Stripe(process.env.STRIPE_SECRET);          // sk_test_…
const bot    = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling:true });
const supa   = createClient(process.env.SUPA_URL, process.env.SUPA_KEY);

app.use(cors({ origin:'https://blaze-bot-five.vercel.app' })); // front-end origin

// Apply raw body parser to webhook route BEFORE json parser
app.use('/stripe-webhook', express.raw({type: 'application/json'}));

app.use(express.json());
app.use(express.static('public'));                            // index.html / paid.html

/* /start opens mini-app */
bot.onText(/\/start/, msg => {
  bot.sendMessage(msg.chat.id,'Tap below to purchase.',{
    reply_markup:{inline_keyboard:[[{
      text:'Open mini-app', web_app:{ url:'https://blaze-bot-five.vercel.app' }
    }]]}
  });
});

/* 1 ─ create Checkout Session */
app.get('/api/create-checkout', async (req,res)=>{
  const tg = req.query.tgid;
  if(!tg) return res.status(400).json({error:'tgid missing'});
  const session = await stripe.checkout.sessions.create({
    mode:'payment',
    ui_mode: 'embedded',
    line_items:[{
      price_data:{currency:'usd',unit_amount:100,product_data:{name:'Blaze panel'}},
      quantity:1
    }],
    return_url: `https://blaze-bot-five.vercel.app/paid.html?session_id={CHECKOUT_SESSION_ID}`,
    client_reference_id: tg,
    metadata:{ telegram_id: tg },
    payment_intent_data: {
      metadata: { telegram_id: tg }
    }
  });
  res.json({ client_secret: session.client_secret });
});

/* 2 ─ Stripe webhook */
app.post('/stripe-webhook', async (req,res)=>{
  let event;
  try{
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WHSEC            // whsec_…
    );
  }catch(e){ return res.status(400).send(`Bad sig ${e.message}`); }
  
  console.log('Received webhook event:', event.type);

  // if(event.type==='checkout.session.completed'){
  //   const s  = event.data.object;
  //   const tg = s.metadata.telegram_id || s.client_reference_id;

  //   await supa.from('payments').insert({ telegram_id: tg, status:'paid', amount: s.amount_total });
  //   const qr = await QRCode.toDataURL(`appt-${Date.now()}-tg-${tg}`);
  //   await bot.sendPhoto(tg,{url:qr},{caption:'Show this QR at your blood draw.'});
  //   await bot.sendMessage(tg,'✅ Payment received – see you soon!');
  // }
  
  if(event.type==='payment_intent.succeeded'){
    const pi = event.data.object;
    const tg = pi.metadata.telegram_id;
    console.log('Payment intent succeeded for telegram_id:', tg);
    
    if(tg) {
      try {
        const insertData = { telegram_id: tg, status: 'paid' };
        console.log('Attempting to insert:', insertData);
        
        const { data, error } = await supa.from('payments').insert(insertData);
        if (error) {
          console.error('Supabase error:', error);
        } else {
          console.log('Payment record inserted into database:', data);
        }
        
        const qrBuffer = await QRCode.toBuffer(`appt-${Date.now()}-tg-${tg}`);
        await bot.sendPhoto(tg, qrBuffer, { caption: 'Show this QR at your blood draw.' });
        
        await bot.sendMessage(tg, '✅ Payment received – see you soon!');
        console.log('QR code sent to telegram_id:', tg);
      } catch (error) {
        console.error('Error processing payment:', error);
      }
    } else {
      console.log('No telegram_id found in payment intent metadata');
    }
  }
  res.sendStatus(200);
});

// No deep-link handler needed - webhook handles everything

app.listen(process.env.PORT || 3000, ()=>console.log('Server started'));