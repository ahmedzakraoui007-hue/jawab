import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth';
import { businessesRouter } from './routes/businesses';
import { errorHandler } from './middleware/error-handler';

const app = express();

const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/businesses', businessesRouter);

// Must be registered last — Express identifies error middleware by its
// 4-argument signature, not registration order per se, but convention
// (and correctness for unmatched routes) puts it after everything else.
app.use(errorHandler);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
    console.log(`[jawab-server] listening on :${port}`);
});
