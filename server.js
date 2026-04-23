require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

// User Schema & Model
const userSchema = new mongoose.Schema({
  googleId: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  name: { type: String, required: true },
  favorites: [{ type: String }],
  searchHistory: [{ type: String }]
});

const User = mongoose.model('User', userSchema);

// 1. Login/Upsert user (SSO)
app.post('/api/login', async (req, res) => {
  try {
    const { googleId, email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Upsert User: Create if not exists, Update if exists
    const user = await User.findOneAndUpdate(
      { email },
      { googleId, name },
      { new: true, upsert: true }
    );

    res.status(200).json({ message: 'User authenticated', user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 1.b Signup Route
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ error: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    user = new User({ 
      email, 
      password: hashedPassword, 
      name: name || email.split('@')[0] 
    });
    await user.save();
    
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 1.c Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.password) {
      return res.status(400).json({ error: 'Account connected to Google SSO. Use Google Sign In.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid password' });

    res.status(200).json({ message: 'User authenticated', user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Fetch User Favorites
app.get('/api/favorites/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ favorites: user.favorites });
  } catch (error) {
    console.error('Fetch favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Add to Favorites
app.post('/api/favorites', async (req, res) => {
  try {
    const { email, city } = req.body;

    if (!email || !city) {
      return res.status(400).json({ error: 'email and city are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.favorites.includes(city)) {
      user.favorites.push(city);
      await user.save();
    }

    res.status(200).json({ message: 'City added to favorites', favorites: user.favorites });
  } catch (error) {
    console.error('Update favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Update Search History
app.post('/api/user/history', async (req, res) => {
  try {
    const { email, city } = req.body;

    if (!email || !city) {
      return res.status(400).json({ error: 'Email and city are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.searchHistory.push(city);
    await user.save();

    res.status(200).json({ message: 'History updated', searchHistory: user.searchHistory });
  } catch (error) {
    console.error('Update history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
