import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
dns.setDefaultResultOrder('ipv4first');

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const Medicine = mongoose.model('Medicine', new mongoose.Schema({
  name: { type: String, required: true },
  composition1: String,
  composition2: String,
  price: String,
  manufacturer: String,
  isDiscontinued: Boolean,
  sideEffects: [String],
  uses: [String],
  substitutes: [String],
  therapeuticClass: String,
  actionClass: String,
  chemicalClass: String,
  habitForming: Boolean
}, { collection: 'medicines' }));

async function seed() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in .env');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);

    const filePath = path.resolve(__dirname, '../data/medicines_cleaned.json');
    const medicines = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    console.log(`Found ${medicines.length} medicines in file`);

    await Medicine.deleteMany({});
    console.log('Collection cleared');

    await Medicine.insertMany(medicines, { ordered: false });

    const count = await Medicine.countDocuments();
    console.log(`Seeding complete. ${count} documents verified in database.`);

  } catch (err) {
    console.error('Seeding failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
    process.exit(0);
  }
}

seed();
