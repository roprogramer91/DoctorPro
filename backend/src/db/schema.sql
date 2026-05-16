-- Ejecutar en Railway PostgreSQL (dev y prod por separado)

CREATE TABLE IF NOT EXISTS doctors (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  name        VARCHAR(255),
  specialty   VARCHAR(255),
  mp          VARCHAR(50),
  mn          VARCHAR(50),
  signature_url TEXT,
  active      BOOLEAN DEFAULT true,
  trial_ends  TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
  created_at  TIMESTAMP DEFAULT NOW()
);
