#!/bin/sh
npx prisma migrate deploy
node src/index.js
