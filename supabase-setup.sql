-- ============================================================
-- SiklusKu – Supabase Database Setup
-- Jalankan seluruh SQL ini di Supabase SQL Editor
-- ============================================================

-- 1. Buat tabel logs siklus haid
CREATE TABLE IF NOT EXISTS public.cycle_logs (
  id            BIGINT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date    DATE NOT NULL,
  end_date      DATE,
  flow          TEXT CHECK (flow IN ('ringan','sedang','deras','')),
  mood          TEXT,
  symptoms      TEXT[] DEFAULT '{}',
  note          TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index untuk performa query per user
CREATE INDEX IF NOT EXISTS idx_cycle_logs_user_id ON public.cycle_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_cycle_logs_start_date ON public.cycle_logs(user_id, start_date DESC);

-- 3. Row Level Security – WAJIB agar data antar user terpisah
ALTER TABLE public.cycle_logs ENABLE ROW LEVEL SECURITY;

-- Policy: user hanya bisa SELECT data milik sendiri
CREATE POLICY "Users can view own logs"
  ON public.cycle_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: user hanya bisa INSERT data milik sendiri
CREATE POLICY "Users can insert own logs"
  ON public.cycle_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: user hanya bisa UPDATE data milik sendiri
CREATE POLICY "Users can update own logs"
  ON public.cycle_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: user hanya bisa DELETE data milik sendiri
CREATE POLICY "Users can delete own logs"
  ON public.cycle_logs FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Auto-update updated_at saat row diubah
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.cycle_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SELESAI! Tabel siap digunakan.
-- ============================================================
