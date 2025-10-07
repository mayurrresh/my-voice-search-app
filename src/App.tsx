// TypeScript fixes for Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type SpeechRecognition = any;
type SpeechRecognitionEvent = any;
type SpeechRecognitionErrorEvent = any;

import React, { useState, useRef } from 'react';

interface SearchResult {
  title: string;
  summary: string;
  link: string;
  snippet?: string;
}

const App: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<number>(0); // New: Track confidence
  const recognitionRef = useRef<any>(null);

  // Improved Speech Recognition with confidence & continuous mode
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported. Use Chrome or Edge for voice input. Typing works fine!');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition unavailable. Try updating your browser or use typing mode.');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    // Enhanced config: Continuous for better UX, but stops on silence
    recognition.continuous = true; // New: Allows multi-sentence queries
    recognition.interimResults = true; // New: Shows partial transcripts
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setQuery(''); // Clear for new input
      console.log('Listening started...');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
          const conf = result[0].confidence;
          setConfidence(conf * 100); // Track confidence
          if (conf < 0.8) { // New: Threshold check
            alert(`Low confidence (${Math.round(conf * 100)}%). Noisy? Try speaking clearer or typing.`);
            return;
          }
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Update input with final + interim for real-time feel
      setQuery(finalTranscript + interimTranscript);
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

    recognition.onspeechend = () => { // New: Natural stop on silence
      setIsListening(false);
      recognition.stop();
      if (query.trim() && confidence >= 80) {
        // Auto-search if confident (optional - comment out if unwanted)
        // performSearch(query.trim());
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (error) {
      alert('Failed to start listening. Ensure mic permissions and try again.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setConfidence(0);
    }
  };

  // Search function (unchanged, but with better error handling)
  const performSearch = async (query: string) => {
    setIsProcessing(true);
    setSearchResults([]);

    try {
      const response = await fetch('http://localhost:5000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      const mockResults: SearchResult[] = [
        { title: 'Fallback Result 1', summary: `General info about "${query}" (Backend unavailable)`, link: '#', snippet: '' },
        { title: 'Fallback Result 2', summary: `News and updates on ${query}`, link: '#', snippet: '' },
        { title: 'Fallback Result 3', summary: `Tutorials for ${query}`, link: '#', snippet: '' },
        { title: 'Fallback Result 4', summary: `Related topics to ${query}`, link: '#', snippet: '' },
        { title: 'Fallback Result 5', summary: `Expert insights on ${query}`, link: '#', snippet: '' },
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
        .mic-button.listening { 
          background: #ef4444; animation: pulse 1s infinite; 
        }
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
          background: #f8fafc; border-radius: 15px; padding: 20px; border-left: 4px solid #4f46e5; transition: all 0.3s ease; 
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        .result-card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .result-title { color: #1f2937; margin-bottom: 10px; font-size: 1.3rem; }
        .result-text { color: #4b5563; line-height: 1.6; margin-bottom: 10px; }
        .result-snippet { 
          font-size: 0.9rem; color: #6b7280; font-style: italic; margin: 10px 0; 
          border-left: 2px solid #d1d5db; padding-left: 10px; background: #f1f5f9;
        }
        .result-link { 
          color: #4f46e5; text-decoration: none; font-weight: bold; font-size: 0.95rem; 
          display: inline-block; margin-top: 10px; transition: color 0.3s ease;
        }
        .result-link:hover { color: #3730a3; text-decoration: underline; }
        
        .no-results { padding: 30px; text-align: center; color: #6b7280; font-size: 1.1rem; }
        
        /* Mobile Responsiveness */
        @media (max-width: 768px) { 
          .app { padding: 10px; } 
          .header h1 { font-size: 2rem; } 
          .input-group { flex-direction: column; gap: 15px; } 
          .search-input, .search-button { width: 100%; } 
          .results-grid { grid-template-columns: 1fr; } 
        }
        
        /* Confidence Indicator (Subtle) */
        .confidence { font-size: 0.8rem; color: #10b981; margin-left: 10px; opacity: 0; transition: opacity 0.3s; }
        .confidence.show { opacity: 1; }
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
                {isListening && <span className="confidence show">{Math.round(confidence)}% confident</span>}
              </button>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isListening ? "Listening... Speak now!" : "Speak or type your query..."}
                className="search-input"
                disabled={isProcessing || isListening} // Disable typing while listening
              />
              <button
                onClick={handleSearch}
                disabled={!query.trim() || isProcessing}
                className={`search-button ${isProcessing ? 'processing' : ''}`}
              >
                {isProcessing ? <span className="spinner">🔄</span> : 'Search'}
              </button>
            </div>
            {isListening && <p style={{textAlign: 'center', color: '#ef4444', marginTop: '10px', fontSize: '0.9rem'}}>Listening... Speak clearly!</p>}
          </div>

          {searchResults.length > 0 && (
            <div className="results-section">
              <h2>Search Results for "{query}"</h2>
              <div className="results-grid">
                {searchResults.map((result, index) => (
                  <div key={index} className="result-card">
                    <h4 className="result-title">{result.title}</h4>
                    <p className="result-text">{result.summary}</p>
                    {result.snippet && (
                      <p className="result-snippet">
                        {result.snippet.replace(/<[^>]*>/g, '').substring(0, 150)}... {/* Truncate long snippets */}
                      </p>
                    )}
                    {result.link && result.link !== '#' && (
                      <a
                        href={result.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="result-link"
                      >
                        Read more on Wikipedia →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchResults.length === 0 && query.trim() && !isProcessing && (
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
