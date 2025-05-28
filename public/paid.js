// Paid page JavaScript
Telegram.WebApp.ready();

const messageDiv = document.getElementById('message');

const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('session_id');

function updateMessage(text, className) {
  messageDiv.innerHTML = text; // Remove spinner
  messageDiv.className = className;
}

if (sessionId) {
  console.log('Processing payment for session:', sessionId);
  
  // Get telegram ID from Telegram WebApp
  const telegramId = Telegram.WebApp.initDataUnsafe?.user?.id;
  
  if (telegramId) {
    // Directly process the payment
    fetch('/api/process-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        telegram_id: telegramId
      })
    })
    .then(response => response.json())
    .then(result => {
      console.log('Processing result:', result);
      if (result.success) {
        updateMessage("✅ Payment successful! Thank you.<br><br>Your QR code is being sent to the chat.", 'status-complete');
      } else {
        updateMessage("⚠️ Payment processing failed.<br><br>Please contact support if this persists.", 'status-error');
      }
      
      // Auto-close after success
      if (result.success && window.Telegram && window.Telegram.WebApp) {
        Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        setTimeout(() => {
          Telegram.WebApp.close();
        }, 3000);
      }
    })
    .catch(err => {
      console.error('Processing failed:', err);
      updateMessage("⚠️ An error occurred while processing payment.<br><br>Please check your Telegram chat for confirmation.", 'status-error');
    });
  } else {
    updateMessage("⚠️ Unable to identify user.<br><br>Please return to the bot and try again.", 'status-error');
  }
} else {
  updateMessage(
    "No payment session found.<br><br>Please return to the bot and try again.",
    'status-error'
  );
} 