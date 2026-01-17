// ==================== IMPORTS ====================
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const Search = require("./models/Search");
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ==================== INITIALIZATION ====================
const app = express();
const PORT = process.env.PORT || 5000;
const WIKI_API_URL = 'https://en.wikipedia.org/w/api.php';

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());

// ==================== MONGODB CONNECTION ====================
const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb+srv://mayureshkahar777:Vbw0e2jYsWtBXJmW@cluster0.o5vp7gp.mongodb.net/wikiApp?retryWrites=true&w=majority';

console.log('\n📋 MongoDB Configuration:');
console.log(`   URI: ${MONGO_URI}\n`);

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Connected to MongoDB\n'))
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });

// ==================== SCHEMAS ====================

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

// Search Query Schema
const searchQuerySchema = new mongoose.Schema({
  username: { type: String, required: true },
  query: { type: String, required: true },
  results: { type: Array },
  timestamp: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const SearchQuery = mongoose.model('SearchQuery', searchQuerySchema);

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: 'Username and password required' });

    if (password.length < 6)
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters' });

    const existing = await User.findOne({ username });
    if (existing)
      return res.status(400).json({ error: 'Username already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'User registered successfully', username });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: 'Username and password required' });

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(401).json({ error: 'Invalid credentials' });

    res.json({
      message: 'Login successful',
      username: user.username,
      userId: user._id,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus =
    dbState === 1 ? 'Connected' : dbState === 2 ? 'Connecting' : 'Disconnected';
  res.json({ status: 'Backend is running!', database: dbStatus });
});

// ==================== SEARCH ENDPOINT ====================
app.post('/api/search', async (req, res) => {
  await Search.create({
  query,
  username: username || "Guest"
});

  const { query, username } = req.body;

  console.log(`🔍 Search request: "${query}" by ${username || 'Guest'}`);

  if (!query || query.trim() === '')
    return res.status(400).json({ error: 'Query is required' });

  try {
const searchResponse = await axios.get(WIKI_API_URL, {
  params: {
    action: 'query',
    format: 'json',
    list: 'search',
    srsearch: query,
    srlimit: 5,
  },
  headers: {
    "User-Agent": "MyVoiceSearchApp/1.0 (contact: you@email.com)"
  }
});

    const searchResults = searchResponse.data.query.search || [];
    const detailedResults = await Promise.all(
       searchResults.map(async (item) => {
    const summaryResponse = await axios.get(WIKI_API_URL, {
      params: {
        action: 'query',
        format: 'json',
        prop: 'extracts',
        pageids: item.pageid,
        exintro: true,
        explaintext: true,
      },
      headers: {
        "User-Agent": "MyVoiceSearchApp/1.0 (contact: you@email.com)"
      }
    });

        const extract =
          summaryResponse.data.query.pages[item.pageid]?.extract ||
          'No summary available.';
        const title = item.title;
        const link = `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;

        return {
          title,
          summary: extract.substring(0, 200) + (extract.length > 200 ? '...' : ''),
          link,
        };
      })
    );

    // ✅ Always store the search in DB (even for Guest)
    const userToSave = username && username.trim() !== '' ? username : 'Guest';
    const searchRecord = new SearchQuery({
      username: userToSave,
      query,
      results: detailedResults,
    });
    await searchRecord.save();
    console.log(`📝 Saved search "${query}" by ${userToSave}`);

    res.json({ results: detailedResults });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

// ==================== SEARCH HISTORY ====================

// Get user history
app.get('/api/search-history/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const history = await Search.find({ username })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ history });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});


// Delete history
app.delete('/api/search-history/:username', async (req, res) => {
  try {
    const { username } = req.params;
    await SearchQuery.deleteMany({ username });
    res.json({ message: 'Search history deleted successfully' });
  } catch (error) {
    console.error('Delete history error:', error);
    res.status(500).json({ error: 'Failed to delete history' });
  }
});

// ==================== ADMIN ROUTES ====================
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }).sort({ created_at: -1 });
    res.json({ users });
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalSearches = await SearchQuery.countDocuments();

    const topSearches = await SearchQuery.aggregate([
      { $group: { _id: '$query', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      totalUsers,
      totalSearches,
      topSearches: topSearches.map((s) => ({
        query: s._id,
        count: s.count,
      })),
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('\n📍 Endpoints:');
  console.log('   GET  /api/health');
  console.log('   POST /api/register');
  console.log('   POST /api/login');
  console.log('   POST /api/search');
  console.log('   GET  /api/search-history/:username');
  console.log('   GET  /api/users');
  console.log('   GET  /api/stats\n');
});
