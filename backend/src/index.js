require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

app.use('/api/auth',    require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`DoctorPro API [${process.env.NODE_ENV}] → puerto ${PORT}`));
