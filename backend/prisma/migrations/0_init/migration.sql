-- Baseline migration: tabla doctors existente + columnas MercadoPago
-- Todas las sentencias son idempotentes (IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS doctors (
  id                SERIAL PRIMARY KEY,
  email             VARCHAR(255) UNIQUE NOT NULL,
  password          VARCHAR(255) NOT NULL,
  name              VARCHAR(255),
  specialty         VARCHAR(255),
  mp                VARCHAR(100),
  mn                VARCHAR(100),
  signature_url     TEXT,
  active            BOOLEAN NOT NULL DEFAULT true,
  trial_ends        TIMESTAMP,
  reset_token       VARCHAR(255),
  reset_token_expires TIMESTAMP
);

-- Columnas de MercadoPago (se agregan si no existen)
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) NOT NULL DEFAULT 'trial';
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS subscribed_until TIMESTAMP;
