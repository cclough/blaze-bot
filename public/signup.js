// Signup page JavaScript
Telegram.WebApp.ready();

const proceedButton = document.getElementById('proceed-button');
const signupForm = document.getElementById('signup-form');
const checkoutElement = document.getElementById('checkout');
const modalElement = document.getElementById('modal');
const backgroundElement = document.getElementById('background');

let stripe; // Don't initialize yet
let userUnits = 'imperial'; // Default to imperial for US launch

// Update form labels based on units selection
function updateFormLabels() {
  const heightLabel = document.getElementById('height-label');
  const weightLabel = document.getElementById('weight-label');
  const heightInput = document.getElementById('height');
  const weightInput = document.getElementById('weight');
  
  // Check if elements exist before updating
  if (!heightLabel || !weightLabel || !heightInput || !weightInput) {
    console.warn('Form elements not found, retrying...');
    return;
  }
  
  if (userUnits === 'imperial') {
    heightLabel.textContent = 'Height (ft/in)';
    weightLabel.textContent = 'Weight (lbs)';
    heightInput.placeholder = 'e.g., 5.8 (5 ft 8 in)';
    weightInput.placeholder = 'e.g., 150';
    heightInput.step = '0.1';
    heightInput.min = '3.0';
    heightInput.max = '8.5';
    weightInput.min = '65';
    weightInput.max = '660';
  } else {
    heightLabel.textContent = 'Height (cm)';
    weightLabel.textContent = 'Weight (kg)';
    heightInput.placeholder = 'e.g., 175';
    weightInput.placeholder = 'e.g., 70';
    heightInput.step = '1';
    heightInput.min = '100';
    heightInput.max = '250';
    weightInput.min = '30';
    weightInput.max = '300';
  }
}

// Convert imperial to metric for storage
function convertToMetric(height, weight) {
  if (userUnits === 'imperial') {
    // Height: feet to cm (1 ft = 30.48 cm)
    const heightCm = Math.round(height * 30.48);
    // Weight: lbs to kg (1 lb = 0.453592 kg)
    const weightKg = Math.round(weight * 0.453592);
    return { height: heightCm, weight: weightKg };
  }
  return { height: Math.round(height), weight: Math.round(weight) };
}

// Form validation
function validateForm() {
  let isValid = true;
  
  // Clear previous errors
  document.querySelectorAll('.form-error').forEach(error => {
    error.style.display = 'none';
  });
  
  // Validate age
  const age = document.getElementById('age').value;
  if (!age || age < 18) {
    document.getElementById('age-error').style.display = 'block';
    isValid = false;
  }
  
  // Validate gender
  const gender = document.getElementById('gender').value;
  if (!gender) {
    document.getElementById('gender-error').style.display = 'block';
    isValid = false;
  }
  
  // Validate height (with unit conversion)
  const height = parseFloat(document.getElementById('height').value);
  let heightValid = false;
  if (userUnits === 'imperial') {
    heightValid = height >= 3.0 && height <= 8.5;
  } else {
    heightValid = height >= 100 && height <= 250;
  }
  
  if (!height || !heightValid) {
    document.getElementById('height-error').style.display = 'block';
    isValid = false;
  }
  
  // Validate weight (with unit conversion)
  const weight = parseFloat(document.getElementById('weight').value);
  let weightValid = false;
  if (userUnits === 'imperial') {
    weightValid = weight >= 65 && weight <= 660;
  } else {
    weightValid = weight >= 30 && weight <= 300;
  }
  
  if (!weight || !weightValid) {
    document.getElementById('weight-error').style.display = 'block';
    isValid = false;
  }
  
  // Validate all waivers are checked
  const waivers = document.querySelectorAll('.waiver-checkbox');
  let allWaiversChecked = true;
  waivers.forEach(waiver => {
    if (!waiver.checked) {
      allWaiversChecked = false;
    }
  });
  
  if (!allWaiversChecked) {
    Telegram.WebApp.showAlert('Please accept all terms and conditions to proceed.');
    isValid = false;
  }
  
  return isValid;
}

// Handle form submission
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!validateForm()) {
    return;
  }
  
  // Add loading state to button
  proceedButton.classList.add('loading');
  
  // Convert measurements to metric for storage
  const rawHeight = parseFloat(document.getElementById('height').value);
  const rawWeight = parseFloat(document.getElementById('weight').value);
  const converted = convertToMetric(rawHeight, rawWeight);
  
  // Collect form data as query parameters
  const formData = {
    age: document.getElementById('age').value,
    gender: document.getElementById('gender').value,
    height: converted.height, // Always in cm
    weight: converted.weight, // Always in kg
    units_preference: userUnits,
    waivers_accepted: 'true'
  };
  
  try {
    // Get Telegram user ID with better error handling
    let tgid;
    if (Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user && Telegram.WebApp.initDataUnsafe.user.id) {
      tgid = Telegram.WebApp.initDataUnsafe.user.id;
    } else {
      // Fallback for testing or if Telegram data is not available
      console.warn('Telegram user ID not available, using fallback');
      tgid = '1316804034'; // Use a test ID or handle differently
    }
    
    console.log('Using tgid:', tgid);
    console.log('Form data:', formData);
    
    // Send form data to server to store in database and create checkout session
    const response = await fetch(`https://blaze-bot-five.vercel.app/api/create-checkout?tgid=${tgid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const { client_secret, publishable_key, error } = await response.json();

    if (error) {
      console.error('Error from backend:', error);
      Telegram.WebApp.showAlert('Could not initiate payment. ' + error);
      proceedButton.classList.remove('loading');
      return;
    }

    if (!client_secret) {
      console.error('Client secret not received');
      Telegram.WebApp.showAlert('Could not initiate payment. Missing client secret.');
      proceedButton.classList.remove('loading');
      return;
    }
    
    if (!publishable_key) {
      console.error('Publishable key not received');
      Telegram.WebApp.showAlert('Could not initiate payment. Missing publishable key.');
      proceedButton.classList.remove('loading');
      return;
    }
    
    // Initialize Stripe with the publishable key from the server
    stripe = Stripe(publishable_key);
    
    modalElement.style.display = 'none';
    backgroundElement.style.display = 'none';
    checkoutElement.style.display = 'block';

    const checkout = await stripe.initEmbeddedCheckout({
      clientSecret: client_secret,
    });

    checkout.mount('#checkout');
    
  } catch (e) {
    console.error('Error processing signup:', e);
    Telegram.WebApp.showAlert('Could not process signup. ' + e.message);
    proceedButton.classList.remove('loading');
  }
});

// Make waiver items clickable
document.addEventListener('DOMContentLoaded', function() {
  // Initialize form with default units
  updateFormLabels();
  
  // Add event listener for units selection
  const unitsSelect = document.getElementById('units');
  if (unitsSelect) {
    unitsSelect.addEventListener('change', function() {
      userUnits = this.value;
      updateFormLabels();
      
      // Clear height and weight values when switching units
      document.getElementById('height').value = '';
      document.getElementById('weight').value = '';
    });
  }
  
  const waiverItems = document.querySelectorAll('.waiver-item');
  waiverItems.forEach(item => {
    item.addEventListener('click', function(e) {
      // Don't trigger if clicking directly on checkbox
      if (e.target.type === 'checkbox') return;
      
      const checkbox = item.querySelector('.waiver-checkbox');
      checkbox.checked = !checkbox.checked;
      
      // Trigger change event for validation
      checkbox.dispatchEvent(new Event('change'));
    });
  });
  
  // Prevent form field issues by ensuring proper focus
  const formInputs = document.querySelectorAll('input, select');
  formInputs.forEach(input => {
    input.addEventListener('click', function(e) {
      e.stopPropagation();
      this.focus();
    });
  });
}); 