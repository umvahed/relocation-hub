-- Add total allowance amount to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS relocation_allowance_amount DECIMAL(10,2);

-- Expense entries logged against the allowance
CREATE TABLE IF NOT EXISTS allowance_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount_eur DECIMAL(10,2) NOT NULL CHECK (amount_eur > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE allowance_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own allowance expenses"
  ON allowance_expenses FOR ALL
  USING (auth.uid() = user_id);
