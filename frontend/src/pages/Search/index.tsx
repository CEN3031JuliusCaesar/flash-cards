import "./style.css";
import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { type SearchResult, searchSets } from "../../api/sets";

export default function SearchPage() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Get search query from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("q");
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, []);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchSets(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: Event) => {
    e.preventDefault();
    performSearch(searchQuery);
    // Update URL with search query
    window.history.pushState(
      {},
      "",
      `/search?q=${encodeURIComponent(searchQuery)}`,
    );
  };

  return (
    <div class="search-page">
      {/* Search Header */}
      <div class="search-header">
        <h1>Search Study Sets</h1>
        <form class="search-form" onSubmit={handleSearch}>
          <div class="search-input-container">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              class="search-input-large"
              placeholder="Search for study sets, cards, or topics..."
              value={searchQuery}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              autoFocus
            />
            <button type="submit" class="search-button">
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Search Results */}
      <div class="search-content">
        {isSearching
          ? (
            <div class="search-loading">
              <div class="loading-spinner"></div>
              <p>Searching...</p>
            </div>
          )
          : searchQuery && searchResults.length === 0
          ? (
            <div class="no-results">
              <span class="no-results-icon">🔍</span>
              <h2>No results found</h2>
              <p>Try different keywords or check your spelling</p>
            </div>
          )
          : searchQuery
          ? (
            <div class="results-container">
              <p class="results-count">
                Found {searchResults.length}{" "}
                result{searchResults.length !== 1 ? "s" : ""}
              </p>
              <div class="results-list">
                {searchResults.map((result) => (
                  <div key={result.id} class="result-card">
                    <div class="result-header">
                      <span class="result-type-badge">Study Set</span>
                      <span class="result-rank">
                        Rank: {result.rank.toFixed(2)}
                      </span>
                    </div>
                    <h3 class="result-title">{result.title}</h3>
                    <div class="result-footer">
                      <span class="result-author">By {result.owner}</span>
                      <button
                        class="result-action-button"
                        onClick={() =>
                          location.route(`/set/${result.id}`)}
                      >
                        View Set
                      </button>
                    </div>
                    {result.card && result.card.front && (
                      <div class="card-preview-single">
                        <span class="card-label">Sample Card:</span>
                        <p class="card-text">"{result.card.front}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
          : (
            <div class="search-empty">
              <span class="empty-icon">📚</span>
              <h2>Start searching</h2>
              <p>Enter keywords to find study sets and flashcards</p>
            </div>
          )}
      </div>
    </div>
  );
}
