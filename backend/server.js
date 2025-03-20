// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Message = require('./models/Message');
const User = require('./models/User');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb+srv://yuvashreebhoopathy:Yuva%402004@cluster0.hjgjv.mongodb.net/Pet?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Initialize Google Generative AI (Gemini)
const genAI = new GoogleGenerativeAI('AIzaSyC8DAChYdFPif4RgQSYVkneoMHKDvnjgrw');

app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    const defaultUserId = '67d3cfc3b40a951803c0185c';
    const userIdToUse = userId || defaultUserId;

    // ✅ Fetch previous conversation history for better context
    const previousMessages = await Message.find({ userId: userIdToUse }).sort({ createdAt: -1 }).limit(5);

    const chatHistory = previousMessages
      .reverse()
      .map(msg => `${msg.sender}: ${msg.text}`)
      .join("\n");

    // ✅ Generate AI response with context
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(
      `You are a helpful assistant for a pet rescue organization. 
      You are very knowledgeable about pets and animals of all kinds in general. 
      You are very professional and fun to talk with. 
      You know about animals of all kinds. Keep responses short and precise.

      Chat History:
      ${chatHistory}

      User: ${message}
      
      Assistant:`
    );

    const aiResponse = result.response?.text() || "I'm sorry, I couldn't process that.";

    // ✅ Save user message to database
    await Message.create({ text: message, sender: 'user', userId: userIdToUse });

    // ✅ Save bot response to database
    await Message.create({ text: aiResponse, sender: 'bot', userId: userIdToUse });

    return res.json({ message: aiResponse });

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return res.status(500).json({ error: 'Failed to process your request' });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});