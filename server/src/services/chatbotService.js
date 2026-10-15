import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let bookContext = '';

async function loadMedicalBook() {
  try {
    const { PDFParse } = await import('pdf-parse');
    const dataBuffer = fs.readFileSync(
      path.join(__dirname, '..', 'Medical_book.pdf')
    );
    const parser = new PDFParse({ data: dataBuffer });
    const pdfData = await parser.getText();
    await parser.destroy();

    bookContext = pdfData.text.substring(0, 12000);
    console.log('Medical Book has loaded successfully.');
  } catch (error) {
    console.error(
      'Failed to load Medical_book.pdf. Running general AI mode:',
      error.message
    );
  }
}

void loadMedicalBook();

export async function getChatResponse(userMessage) {
  try {
    // 1. Check if the API key exists
    const apiKey = process.env.GROQ_API || process.env.AI_API_KEY;
    if (!apiKey) {
      throw new Error('API key is missing in .env file!');
    }

    // 3. Strong Medical Prompt + PDF Context
    const systemMessage = `You are MediGuide Assistant, a precise clinical-support AI. 
      Follow these rules strictly:
      1. Be concise, professional, and medically accurate. Use bullet points.
      2. If you have Medical Book Context below, PRIORITIZE it. Say "According to the provided medical literature..."
      3. If the answer is NOT in the Context, use general knowledge but state: "Based on general medical knowledge..." 
      4. NEVER diagnose a specific patient or prescribe specific drug dosages.
      5. If symptoms sound life-threatening, immediately tell the user to call emergency services (911).

      Medical Book Context:
      ${bookContext || 'No context loaded.'}`;

    // Using GROQ API
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 512,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content;

  } catch (error) {
    // 4. Log the REAL error so you know exactly what went wrong
    console.error('❌ Groq API Error Details:', error.response?.data?.error || error.message);
    return "this is test trouble connecting to the AI service right now. Please try again.";
  }
}