import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

// The project's .env file lives one directory above server/.
dotenv.config({ path: path.resolve(currentDirectory, '../../.env') });

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'MediGuide API' });
});

app.listen(port, () => {
  console.log(`MediGuide API listening on port ${port}`);
});
