-- Add category column to transactions table for AI auto-categorization
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category text DEFAULT 'Uncategorized';

-- Create index for faster category-based queries
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- Optional: Update common patterns if desired (commented out - can be run manually)
-- UPDATE transactions SET category = 'Food & Dining' WHERE description ILIKE '%starbucks%' OR description ILIKE '%mcdonald%' OR description ILIKE '%swiggy%' OR description ILIKE '%zomato%';
-- UPDATE transactions SET category = 'Transportation' WHERE description ILIKE '%uber%' OR description ILIKE '%ola%' OR description ILIKE '%rapido%';
-- UPDATE transactions SET category = 'Shopping' WHERE description ILIKE '%amazon%' OR description ILIKE '%flipkart%' OR description ILIKE '%myntra%';
