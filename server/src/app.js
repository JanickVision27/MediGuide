import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chatRoutes from './routes/chatRoutes.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDirectory, '../../.env') });

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api', chatRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'MediGuide API' });
});

app.listen(port, () => {
  console.log(`MediGuide API listening on http://localhost:${port}`);
});
