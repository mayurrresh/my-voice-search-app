import React, { useState, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './login';
import './Login.css';
import './login'
import { useNavigate } from 'react-router-dom';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type SpeechRecognition = any;

interface SearchResult {
  title: string;
  summary: string;
  link: string;
  snippet?: string;
}

const App: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<number>(0);
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isAuthenticated, username, logout } = useAuth();


  if (!isAuthenticated) {
    return <Login />;
  }

  const User = username || 'user';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported. Use Chrome or Edge for voice input. Typing works fine!');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setQuery('');
      console.log('Listening started...');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
          setConfidence(result[0].confidence * 100);
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const fullTranscript = finalTranscript + interimTranscript;
      setQuery(fullTranscript);

      // Reset 2-second silence timer
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = setTimeout(() => {
        recognition.stop();
        setIsListening(false);
        if (fullTranscript.trim()) performSearch(fullTranscript.trim());
      }, 2000);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      let errorMsg = 'Speech recognition failed. ';
      switch (event.error) {
        case 'no-speech':
          errorMsg += 'No speech detected. Speak louder?';
          break;
        case 'audio-capture':
          errorMsg += 'Microphone access denied. Check permissions.';
          break;
        case 'not-allowed':
          errorMsg += 'Microphone blocked. Enable in browser settings.';
          break;
        default:
          errorMsg += 'Try typing instead.';
      }
      alert(errorMsg);
      recognition.stop();
    };

    recognition.onend = () => {
      console.log('Listening ended.');
      setIsListening(false);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };

    try {
      recognition.start();
    } catch (error) {
      alert('Failed to start listening. Ensure mic permissions and try again.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
    setConfidence(0);
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
  };

  const performSearch = async (searchQuery: string) => {
    setIsProcessing(true);
    setSearchResults([]);
    setHasSearched(true);


    try {
      const response = await fetch('http://localhost:5000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      const mockResults: SearchResult[] = [
        { title: 'Fallback Result 1', summary: `General info about "${searchQuery}" (Backend unavailable)`, link: '#' },
        { title: 'Fallback Result 2', summary: `News and updates on ${searchQuery}`, link: '#' },
        { title: 'Fallback Result 3', summary: `Tutorials for ${searchQuery}`, link: '#' },
        { title: 'Fallback Result 4', summary: `Related topics to ${searchQuery}`, link: '#' },
        { title: 'Fallback Result 5', summary: `Expert insights on ${searchQuery}`, link: '#' },
      ];
      setSearchResults(mockResults);
      alert(`Connection issue: ${(error as Error).message}. Showing fallback results. Check backend on port 5000.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    performSearch(query.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isProcessing) handleSearch();
  };

  return (
    <>
    <div>
      <h1>Welcome, {username}!</h1>
    </div>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; color: #333; }

        .app { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .container { max-width: 800px; width: 100%; background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden; }

        .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 30px; text-align: center; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        .header p { font-size: 1.1rem; opacity: 0.9; }

        .search-section { padding: 30px; }
        .input-group { display: flex; gap: 10px; align-items: center; }
        .mic-button { 
          width: 50px; height: 50px; border: none; border-radius: 50%; background: #4f46e5; color: white; font-size: 1.5rem; cursor: pointer; 
          transition: all 0.3s ease; display: flex; align-items: center; justify-content: center;
        }
        .mic-button:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 5px 15px rgba(79, 70, 229, 0.4); }
        .mic-button.listening { background: #ef4444; animation: pulse 1s infinite; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        .mic-button:disabled { opacity: 0.5; cursor: not-allowed; }

        .search-input { 
          flex: 1; padding: 15px 20px; border: 2px solid #e5e7eb; border-radius: 50px; font-size: 1rem; outline: none; 
          transition: border-color 0.3s ease;
        }
        .search-input:focus { border-color: #4f46e5; }
        .search-input:disabled { background: #f9fafb; cursor: not-allowed; }
        .search-input::placeholder { color: #9ca3af; }

        .search-button { 
          padding: 15px 30px; background: #4f46e5; color: white; border: none; border-radius: 50px; font-size: 1rem; font-weight: bold; 
          cursor: pointer; transition: all 0.3s ease;
        }
        .search-button:hover:not(:disabled) { background: #3730a3; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(79, 70, 229, 0.4); }
        .search-button:disabled { background: #9ca3af; cursor: not-allowed; transform: none; }
        .search-button.processing { background: #f59e0b; }
        .spinner { display: inline-block; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .results-section { padding: 0 30px 30px; }
        .results-section h2 { text-align: center; margin-bottom: 20px; color: #4f46e5; font-size: 1.8rem; }
        .results-grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
        .result-card { 
          background: #f3f4f6; padding: 20px; border-radius: 15px; transition: all 0.3s ease; 
        }
        .result-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        .result-title { font-size: 1.2rem; font-weight: 600; margin-bottom: 10px; color: #111827; }
        .result-text { font-size: 1rem; color: #374151; margin-bottom: 10px; }
        .result-snippet { font-size: 0.9rem; color: #6b7280; margin-bottom: 10px; }
        .result-link { color: #4f46e5; font-weight: bold; text-decoration: none; }
        .result-link:hover { text-decoration: underline; }

        .no-results { padding: 20px; text-align: center; color: #ef4444; font-weight: 500; }
      `}</style>

      <div className="app">
        <div className="container">
          <header className="header">
            <h1>🎤 Voice Search</h1>
            <p>Speak or type to explore Wikipedia. Powered by AI & Real-Time Search!</p>
          </header>

          <div className="search-section">
            <div className="input-group">
              <button
                className={`mic-button ${isListening ? 'listening' : ''}`}
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing}
                title={isListening ? 'Stop Listening' : 'Start Voice Input'}
                aria-label={isListening ? 'Stop microphone' : 'Start microphone'}
              >
                {isListening ? '⏹️' : '🎤'}
              </button>
              <input
                id="search-query"
                type="text"
                value={query}
onChange={(e) => {
  setQuery(e.target.value);
  setHasSearched(false);
}}
                onKeyPress={handleKeyPress}
                placeholder={isListening ? 'Listening... Speak now!' : 'Speak or type your query...'}
                className="search-input"
                disabled={isProcessing || isListening}
              />
              <button
                onClick={handleSearch}
                disabled={!query.trim() || isProcessing}
                className={`search-button ${isProcessing ? 'processing' : ''}`}
              >
                {isProcessing ? 'Searching...' : 'Search'}
              </button>
            </div>
            {isListening && <p style={{ textAlign: 'center', color: '#ef4444', marginTop: '10px', fontSize: '0.9rem' }}>Listening... Speak clearly!</p>}
          </div>

          {searchResults.length > 0 && (
            <div className="results-section">
              <h2>Search Results for "{query}"</h2>
              <div className="results-grid">
                {searchResults.map((result, index) => (
                  <div key={index} className="result-card">
                    <h4 className="result-title">{result.title}</h4>
                    <p className="result-text">{result.summary}</p>
                    {result.snippet && <p className="result-snippet">{result.snippet.replace(/<[^>]*>/g, '').substring(0, 150)}...</p>}
                    {result.link && result.link !== '#' && (
                      <a href={result.link} target="_blank" rel="noopener noreferrer" className="result-link">
                        Read more on Wikipedia →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

{hasSearched && searchResults.length === 0 && !isProcessing && (
  <div className="no-results">
    <p>No results found for "{query}". Try a different query!</p>
  </div>
)}

        </div>
      </div>
    </>
  );
};

export default App;
