-- Minimal payments table for US/EU launch
DROP TABLE IF EXISTS payments;

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  stripe_session_id TEXT UNIQUE,
  amount INTEGER, -- amount in cents
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'pending',
  
  -- User data
  age INTEGER,
  gender TEXT,
  height_cm INTEGER, -- always store in cm
  weight_kg INTEGER, -- always store in kg
  units_preference TEXT DEFAULT 'metric', -- 'metric' or 'imperial'
  
  -- Waivers (simplified)
  waivers_accepted BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Essential indexes only
CREATE INDEX idx_payments_telegram_id ON payments(telegram_id);
CREATE INDEX idx_payments_stripe_session_id ON payments(stripe_session_id); 