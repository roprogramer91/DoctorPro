require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');

const app = express();

app.use(helmet());

const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origen no permitido'));
  }
}));

app.use(express.json());

const authMiddleware = require('./middleware/auth');

app.use('/api/auth',    require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
// El webhook de MP va sin JWT (lo llama MP directamente)
app.use('/api/payments/webhook', require('./routes/payments'));
app.use('/api/payments', authMiddleware, require('./routes/payments'));
app.use('/api/reports', authMiddleware, require('./routes/reports'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`DoctorPro API [${process.env.NODE_ENV}] → puerto ${PORT}`));
