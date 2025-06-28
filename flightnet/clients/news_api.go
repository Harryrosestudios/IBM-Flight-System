package clients

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
	"time"
)

// NewsArticle represents a news article from NewsAPI
type NewsArticle struct {
	Source struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"source"`
	Author      string `json:"author"`
	Title       string `json:"title"`
	Description string `json:"description"`
	URL         string `json:"url"`
	URLToImage  string `json:"urlToImage"`
	PublishedAt string `json:"publishedAt"`
	Content     string `json:"content"`
}

// NewsSource represents a news source from NewsAPI
type NewsSource struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	URL         string `json:"url"`
	Category    string `json:"category"`
	Language    string `json:"language"`
	Country     string `json:"country"`
}

// NewsResponse represents the standard NewsAPI response structure
type NewsResponse struct {
	Status       string        `json:"status"`
	TotalResults int           `json:"totalResults"`
	Articles     []NewsArticle `json:"articles"`
}

// SourcesResponse represents the sources endpoint response
type SourcesResponse struct {
	Status  string       `json:"status"`
	Sources []NewsSource `json:"sources"`
}

// TopHeadlinesParams represents parameters for top headlines endpoint
type TopHeadlinesParams struct {
	Country  string `json:"country,omitempty"`
	Category string `json:"category,omitempty"`
	Sources  string `json:"sources,omitempty"`
	Q        string `json:"q,omitempty"`
	PageSize int    `json:"pageSize,omitempty"`
	Page     int    `json:"page,omitempty"`
}

// EverythingParams represents parameters for everything endpoint
type EverythingParams struct {
	Q          string `json:"q,omitempty"`
	QInTitle   string `json:"qInTitle,omitempty"`
	Sources    string `json:"sources,omitempty"`
	Domains    string `json:"domains,omitempty"`
	From       string `json:"from,omitempty"`
	To         string `json:"to,omitempty"`
	Language   string `json:"language,omitempty"`
	SortBy     string `json:"sortBy,omitempty"`
	PageSize   int    `json:"pageSize,omitempty"`
	Page       int    `json:"page,omitempty"`
}

// SourcesParams represents parameters for sources endpoint
type SourcesParams struct {
	Category string `json:"category,omitempty"`
	Language string `json:"language,omitempty"`
	Country  string `json:"country,omitempty"`
}

// NewsAPI handles news data from NewsAPI.org
type NewsAPI struct {
	fetcher *Fetcher
	parser  *Parser
	apiKey  string
}

// NewNewsAPI creates a new NewsAPI instance
func NewNewsAPI() *NewsAPI {
	apiKey := getAPIKey("NEWS_API_KEY")
	return &NewsAPI{
		fetcher: NewFetcher(),
		parser:  NewParser(),
		apiKey:  apiKey,
	}
}

// GetTopHeadlines fetches top headlines with optional parameters
func (n *NewsAPI) GetTopHeadlines(params TopHeadlinesParams) (*NewsResponse, error) {
	if n.apiKey == "" {
		return n.getMockTopHeadlines(), nil
	}

	// Build query parameters
	queryParams := n.buildTopHeadlinesParams(params)
	queryParams["apiKey"] = n.apiKey

	// Make request using custom fetcher
	data, err := n.makeNewsAPIRequest("top-headlines", queryParams)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch top headlines: %w", err)
	}

	var response NewsResponse
	if err := json.Unmarshal(data, &response); err != nil {
		return nil, fmt.Errorf("failed to parse top headlines response: %w", err)
	}

	return &response, nil
}

// GetEverything fetches all articles matching the query parameters
func (n *NewsAPI) GetEverything(params EverythingParams) (*NewsResponse, error) {
	if n.apiKey == "" {
		return n.getMockEverything(params.Q), nil
	}

	// Build query parameters
	queryParams := n.buildEverythingParams(params)
	queryParams["apiKey"] = n.apiKey

	// Make request using custom fetcher
	data, err := n.makeNewsAPIRequest("everything", queryParams)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch everything: %w", err)
	}

	var response NewsResponse
	if err := json.Unmarshal(data, &response); err != nil {
		return nil, fmt.Errorf("failed to parse everything response: %w", err)
	}

	return &response, nil
}

// GetSources fetches news sources with optional filters
func (n *NewsAPI) GetSources(params SourcesParams) (*SourcesResponse, error) {
	if n.apiKey == "" {
		return n.getMockSources(), nil
	}

	// Build query parameters
	queryParams := n.buildSourcesParams(params)
	queryParams["apiKey"] = n.apiKey

	// Make request using custom fetcher
	data, err := n.makeNewsAPIRequest("top-headlines/sources", queryParams)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch sources: %w", err)
	}

	var response SourcesResponse
	if err := json.Unmarshal(data, &response); err != nil {
		return nil, fmt.Errorf("failed to parse sources response: %w", err)
	}

	return &response, nil
}

// GetGeopoliticalNews fetches news related to geopolitical events
func (n *NewsAPI) GetGeopoliticalNews(countries []string) (*NewsResponse, error) {
	// Build query for geopolitical terms
	geopoliticalTerms := []string{
		"conflict", "war", "sanctions", "diplomacy", "military",
		"terrorism", "security", "politics", "government", "crisis",
	}

	// Add country names to search terms
	searchTerms := append(geopoliticalTerms, countries...)
	query := strings.Join(searchTerms, " OR ")

	params := EverythingParams{
		Q:        query,
		Language: "en",
		SortBy:   "publishedAt",
		PageSize: 20,
	}

	return n.GetEverything(params)
}

// GetNewsByKeywords fetches news articles by specific keywords
func (n *NewsAPI) GetNewsByKeywords(keywords []string) (*NewsResponse, error) {
	query := strings.Join(keywords, " AND ")
	
	params := EverythingParams{
		Q:        query,
		Language: "en",
		SortBy:   "relevancy",
		PageSize: 50,
	}

	return n.GetEverything(params)
}

// GetNewsByCountry fetches top headlines for a specific country
func (n *NewsAPI) GetNewsByCountry(countryCode string) (*NewsResponse, error) {
	params := TopHeadlinesParams{
		Country:  countryCode,
		PageSize: 20,
	}

	return n.GetTopHeadlines(params)
}

// GetNewsByCategory fetches top headlines for a specific category
func (n *NewsAPI) GetNewsByCategory(category string) (*NewsResponse, error) {
	params := TopHeadlinesParams{
		Category: category,
		PageSize: 20,
	}

	return n.GetTopHeadlines(params)
}

// makeNewsAPIRequest makes a request to NewsAPI using the custom fetcher
func (n *NewsAPI) makeNewsAPIRequest(endpoint string, params map[string]string) ([]byte, error) {
	// NewsAPI uses a different base URL structure, so we need to construct it manually
	baseURL := "https://newsapi.org/v2"
	fullURL := fmt.Sprintf("%s/%s", baseURL, endpoint)

	// Add query parameters
	if len(params) > 0 {
		values := url.Values{}
		for key, value := range params {
			if value != "" {
				values.Add(key, value)
			}
		}
		fullURL += "?" + values.Encode()
	}

	// Use direct HTTP request since NewsAPI has a different structure
	resp, err := n.fetcher.client.Get(fullURL)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("NewsAPI returned status %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	return data, nil
}

// Helper functions to build query parameters
func (n *NewsAPI) buildTopHeadlinesParams(params TopHeadlinesParams) map[string]string {
	queryParams := make(map[string]string)

	if params.Country != "" {
		queryParams["country"] = params.Country
	}
	if params.Category != "" {
		queryParams["category"] = params.Category
	}
	if params.Sources != "" {
		queryParams["sources"] = params.Sources
	}
	if params.Q != "" {
		queryParams["q"] = params.Q
	}
	if params.PageSize > 0 {
		queryParams["pageSize"] = fmt.Sprintf("%d", params.PageSize)
	}
	if params.Page > 0 {
		queryParams["page"] = fmt.Sprintf("%d", params.Page)
	}

	return queryParams
}

func (n *NewsAPI) buildEverythingParams(params EverythingParams) map[string]string {
	queryParams := make(map[string]string)

	if params.Q != "" {
		queryParams["q"] = params.Q
	}
	if params.QInTitle != "" {
		queryParams["qInTitle"] = params.QInTitle
	}
	if params.Sources != "" {
		queryParams["sources"] = params.Sources
	}
	if params.Domains != "" {
		queryParams["domains"] = params.Domains
	}
	if params.From != "" {
		queryParams["from"] = params.From
	}
	if params.To != "" {
		queryParams["to"] = params.To
	}
	if params.Language != "" {
		queryParams["language"] = params.Language
	}
	if params.SortBy != "" {
		queryParams["sortBy"] = params.SortBy
	}
	if params.PageSize > 0 {
		queryParams["pageSize"] = fmt.Sprintf("%d", params.PageSize)
	}
	if params.Page > 0 {
		queryParams["page"] = fmt.Sprintf("%d", params.Page)
	}

	return queryParams
}

func (n *NewsAPI) buildSourcesParams(params SourcesParams) map[string]string {
	queryParams := make(map[string]string)

	if params.Category != "" {
		queryParams["category"] = params.Category
	}
	if params.Language != "" {
		queryParams["language"] = params.Language
	}
	if params.Country != "" {
		queryParams["country"] = params.Country
	}

	return queryParams
}

// Mock data functions for testing when API key is not available
func (n *NewsAPI) getMockTopHeadlines() *NewsResponse {
	return &NewsResponse{
		Status:       "ok",
		TotalResults: 2,
		Articles: []NewsArticle{
			{
				Source: struct {
					ID   string `json:"id"`
					Name string `json:"name"`
				}{
					ID:   "reuters",
					Name: "Reuters",
				},
				Author:      "Reuters Staff",
				Title:       "Israel conducts airstrikes on Iranian military facilities",
				Description: "Israeli forces conducted targeted airstrikes on Iranian military installations in response to recent provocations.",
				URL:         "https://reuters.com/mock-article-1",
				URLToImage:  "https://reuters.com/mock-image-1.jpg",
				PublishedAt: time.Now().Format(time.RFC3339),
				Content:     "Israeli military sources confirm targeted strikes on Iranian facilities...",
			},
			{
				Source: struct {
					ID   string `json:"id"`
					Name string `json:"name"`
				}{
					ID:   "bbc-news",
					Name: "BBC News",
				},
				Author:      "BBC News",
				Title:       "Russia restricts airspace over border regions",
				Description: "Russian authorities implement new flight restrictions near Ukrainian border citing security concerns.",
				URL:         "https://bbc.com/mock-article-2",
				URLToImage:  "https://bbc.com/mock-image-2.jpg",
				PublishedAt: time.Now().Add(-1 * time.Hour).Format(time.RFC3339),
				Content:     "Russian aviation authorities announced new restrictions...",
			},
		},
	}
}

func (n *NewsAPI) getMockEverything(query string) *NewsResponse {
	return &NewsResponse{
		Status:       "ok",
		TotalResults: 1,
		Articles: []NewsArticle{
			{
				Source: struct {
					ID   string `json:"id"`
					Name string `json:"name"`
				}{
					ID:   "cnn",
					Name: "CNN",
				},
				Author:      "CNN International",
				Title:       fmt.Sprintf("Breaking: News about %s", query),
				Description: fmt.Sprintf("Latest developments regarding %s and its impact on global affairs.", query),
				URL:         "https://cnn.com/mock-article",
				URLToImage:  "https://cnn.com/mock-image.jpg",
				PublishedAt: time.Now().Format(time.RFC3339),
				Content:     fmt.Sprintf("Recent reports indicate significant developments in %s...", query),
			},
		},
	}
}

func (n *NewsAPI) getMockSources() *SourcesResponse {
	return &SourcesResponse{
		Status: "ok",
		Sources: []NewsSource{
			{
				ID:          "reuters",
				Name:        "Reuters",
				Description: "Reuters delivers business, financial, national and international news",
				URL:         "https://reuters.com",
				Category:    "general",
				Language:    "en",
				Country:     "us",
			},
			{
				ID:          "bbc-news",
				Name:        "BBC News",
				Description: "Use BBC News for up-to-the-minute news, breaking news, video, audio",
				URL:         "https://bbc.com/news",
				Category:    "general",
				Language:    "en",
				Country:     "gb",
			},
		},
	}
}

