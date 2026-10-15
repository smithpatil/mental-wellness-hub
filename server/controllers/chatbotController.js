const Groq = require('groq-sdk');

const generateChatResponse = async (req, res, next) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ success: false, error: 'Message is too long' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ success: false, error: 'Groq API Key is not configured on the server.' });
    }

    // Initialize Groq SDK
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Format history for Groq API
    // Expected incoming format from frontend: [{ role: 'user' | 'model', text: '...' }]
    const formattedHistory = Array.isArray(history) ? history.slice(-20).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.text
    })) : [];

    const systemInstruction = "You are a compassionate, empathetic, and knowledgeable mental wellness assistant on a mental health platform. Your goal is to provide supportive, non-judgmental, and helpful responses to users. You can offer general advice on coping strategies, mindfulness, and stress relief, but you must NEVER attempt to diagnose or provide medical treatment. If a user seems to be in severe distress or crisis, gently encourage them to seek professional help or contact a crisis hotline immediately. Keep your responses concise, well-formatted, and conversational.";

    // Build the messages array
    const messages = [
      { role: 'system', content: systemInstruction },
      ...formattedHistory,
      { role: 'user', content: message }
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: "groq/compound-mini",
      temperature: 0.7,
      max_tokens: 1024,
    });

    const text = chatCompletion.choices[0]?.message?.content || "I'm sorry, I couldn't process that.";

    res.status(200).json({
      success: true,
      message: text
    });
  } catch (error) {
    console.error('Chatbot error:', error);
    next(error);
  }
};

module.exports = {
  generateChatResponse
};
