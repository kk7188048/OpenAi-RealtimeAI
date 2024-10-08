import { RealtimeRelay } from './lib/relay.js';
import express from 'express';
import mongoose from 'mongoose';
import User from './schema.js';
import cors from 'cors';
import dotenv from 'dotenv';
import DynamicModel from './dynamicschema.js';
// import sendGoogleMeetLink from './mailer.js';

dotenv.config({ override: true });

console.log('MongoDB URI:', process.env.MONGODB_URI); // Check if the URI is loaded correctly

const app = express();
const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,
};

// Apply CORS globally
app.use(cors(corsOptions));
app.use(express.json());

// Connect to MongoDB
const connectToMongoDB = async (uri) => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected successfully to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if unable to connect
  }
};

// Ensure the MongoDB URI is available
if (!process.env.MONGODB_URI) {
  console.error('MongoDB URI is not defined in environment variables.');
  process.exit(1);
}

// Connect to MongoDB using the URI from environment variables
connectToMongoDB(process.env.MONGODB_URI);

// Define routes
const router = express.Router();

// Route to save user's name
router.post('/save-name', async (req, res) => {
  try {
    const { name } = req.body;
    const user = new User({ name });
    await user.save();
    res.json({ success: true, userId: user._id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error saving name', error: error.message });
  }
});

// Route to save email
router.post('/save-email', async (req, res) => {
  try {
    const { email, userId } = req.body;
    await User.findByIdAndUpdate(userId, { email });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error saving email', error: error.message });
  }
});

// Route to save mobile number
router.post('/save-mobile', async (req, res) => {
  try {
    const { mobile, userId } = req.body;
    await User.findByIdAndUpdate(userId, { mobile });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error saving mobile', error: error.message });
  }
});

// Route to save time
router.post('/save-time', async (req, res) => {
  try {
    const { time, userId } = req.body;
    await User.findByIdAndUpdate(userId, { time });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error saving time', error: error.message });
  }
});
router.post('/save-date', async (req, res) => {
  try {
    const { date, userId } = req.body;
    await User.findByIdAndUpdate(userId, { date });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error saving date', error: error.message });
  }

})

// router.post('/send-google-meet-link', async (req, res) => {
//   const { email, date, time, userName } = req.body;
//   if (!email || !date || !time) {
//     return res.status(400).json({ error: 'Email, date, and time are required' });
//   }
//   try {
//     await sendGoogleMeetLink(email, date, time, userName);
//     res.json({ success: true });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Error sending Google Meet link', error: error.message });
//   }
// });

router.post('/buisness', async (req, res) => {
  try {
    const { businessType, fields } = req.body; 
    const businessData = new DynamicModel({
      businessType,
      ...fields,
    });

    await businessData.save();
    res.status(201).send(businessData);
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(400).send(error);
  }
});


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('Environment variable "OPENAI_API_KEY" is required. Please set it in your .env file.');
  process.exit(1);
}

const PORT = parseInt(process.env.PORT) || 8081;

const relay = new RealtimeRelay(OPENAI_API_KEY);
relay.listen(PORT);

// Use the router for handling routes
app.use(router);

const PORT1 = 3001; // Ensure you know why you're using a second port
// Start listening with express (check WebSocket config separately)
app.listen(PORT1, () => {
  console.log(`Server running on http://localhost:${PORT1}`);
});
