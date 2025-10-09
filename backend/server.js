const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 5000;
const WIKI_API_URL = 'https://en.wikipedia.org/w/api.php';

// Middleware
app.use(cors()); // Allow requests from React (localhost:3000)
app.use(express.json()); // Parse JSON bodies

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running!' });
});

// Search endpoint: Receives query, searches Wikipedia, returns results
app.post('/api/search', async (req, res) => {
  const { query } = req.body;

  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    // Search Wikipedia for pages matching the query
    const searchResponse = await axios.get(WIKI_API_URL, {
      params: {
        action: 'query',
        format: 'json',
        list: 'search',
        srsearch: query,
        srlimit: 5, // Get top 5 results
        origin: '*', // For CORS
      },
    });

    const searchResults = searchResponse.data.query.search;

    if (searchResults.length === 0) {
      return res.json({ results: [] });
    }

    // For each result, fetch a short summary (extract)
    const detailedResults = await Promise.all(
      searchResults.map(async (item) => {
        const summaryResponse = await axios.get(WIKI_API_URL, {
          params: {
            action: 'query',
            format: 'json',
            prop: 'extracts',
            pageids: item.pageid,
            exintro: true, // Intro only
            explaintext: true, // Plain text
            origin: '*',
          },
        });

        const extract = summaryResponse.data.query.pages[item.pageid].extract || 'No summary available.';
        const title = item.title;
        const link = `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;

        return {
          title,
          summary: extract.substring(0, 200) + (extract.length > 200 ? '...' : ''), // Truncate to 200 chars
          link,
          snippet: item.snippet, // Wikipedia's search snippet
        };
      })
    );

    res.json({ results: detailedResults });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Test endpoints:`);
  console.log(`- Health: http://localhost:${PORT}/api/health`);
  console.log(`- Search: POST to http://localhost:${PORT}/api/search with { "query": "your search" }`);
});