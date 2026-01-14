-- Migration: Add user profile details (billing/contact)
-- Stores My Account billing/contact fields per user

CREATE TABLE IF NOT EXISTS user_profile_details (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255),
  billing_email VARCHAR(255),
  billing_address TEXT,
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_profile_details_user_id ON user_profile_details(user_id);

