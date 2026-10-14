import axios from 'axios';

export async function getChatResponse(userMessage) {
  try {
    // 1. Check if the API key exists
    const apiKey = process.env.GROQ_API || process.env.AI_API_KEY;
    if (!apiKey) {
      throw new Error('API key is missing in .env file!');
    }

    // 2. Define the safety prompt (No PDF for now, keeping it simple)
    const systemMessage = 'You are a general health educator. Do not diagnose or prescribe medication. If symptoms sound urgent, tell the user to call emergency services immediately.';

    // 3. Call Groq
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