-- Migration: Add sandbox_url and error_message to deployments table
-- Run this in your Supabase SQL editor (Database > SQL Editor)

ALTER TABLE deployments
  ADD COLUMN IF NOT EXISTS sandbox_url TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT;
