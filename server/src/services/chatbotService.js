import axios from 'axios';
import fs from 'node:fs';
import { PDFParse } from 'pdf-parse';

let bookContext = '';

async function loadMedicalBook() {
  try {
    const dataBuffer = fs.readFileSync('./Medical_book.pdf');
    const parser = new PDFParse({ data: dataBuffer });
    try {
      const pdfData = await parser.getText();
      bookContext = pdfData.text.substring(0, 15000);
    } finally {
      await parser.destroy();
    }
    console.log('Medical_book.pdf loaded successfully.');
  } catch {
    console.log('Medical_book.pdf unavailable. Running general AI mode.');
  }
}

void loadMedicalBook();

export async function getChatResponse(userMessage) {
  try {
    const systemMessage = bookContext
      ? `You are a helpful medical assistant. Use this Medical Book context to answer. If the answer is not in the context, use general knowledge and say so. Context: ${bookContext}`
      : 'You are a general health educator. Do not diagnose or prescribe medication. If symptoms sound urgent, tell the user to call emergency services immediately.';

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 512,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API || process.env.AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Groq API Error:', error.response?.data || error.message);
    return "I'm having trouble connecting to the AI service right now. Please try again.";
  }
}
