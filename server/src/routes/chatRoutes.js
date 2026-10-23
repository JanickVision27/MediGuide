import { Router } from 'express';
import { getChatResponse } from '../services/chatbotService.js';

const router = Router();

router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const answer = await getChatResponse(message);
    return res.json({ answer });
  } catch (error) {
    console.error('Route Error:', error);
    return res.status(500).json({ error: 'Something went wrong on the server' });
  }
});

export default router;
