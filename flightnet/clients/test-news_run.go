package main

import (
	"fmt"
	"log"
)

func main() {
	fmt.Println("🔍 Testing NewsAPI - Iran Coverage")
	fmt.Println("==================================================")

	// Initialize NewsAPI client directly (no clients. prefix needed)
	newsAPI := NewNewsAPI()

	// Test 1: Get geopolitical news about Iran
	fmt.Println("\n📰 Fetching geopolitical news about Iran...")
	geoNews, err := newsAPI.GetGeopoliticalNews([]string{"Iran"})
	if err != nil {
		log.Printf("Error fetching geopolitical news: %v", err)
	} else {
		fmt.Printf("✅ Found %d geopolitical articles about Iran\n", geoNews.TotalResults)
		displayArticles(geoNews.Articles, 3)
	}

	// Test 2: Search for specific Iran-related keywords
	fmt.Println("\n🔎 Searching for Iran military news...")
	militaryNews, err := newsAPI.GetNewsByKeywords([]string{"Iran", "military"})
	if err != nil {
		log.Printf("Error fetching military news: %v", err)
	} else {
		fmt.Printf("✅ Found %d military-related articles\n", militaryNews.TotalResults)
		displayArticles(militaryNews.Articles, 2)
	}

	// Test 3: Search for Iran sanctions news
	fmt.Println("\n💰 Searching for Iran sanctions news...")
	sanctionsNews, err := newsAPI.GetNewsByKeywords([]string{"Iran", "sanctions"})
	if err != nil {
		log.Printf("Error fetching sanctions news: %v", err)
	} else {
		fmt.Printf("✅ Found %d sanctions-related articles\n", sanctionsNews.TotalResults)
		displayArticles(sanctionsNews.Articles, 2)
	}

	// Test 4: Get general everything about Iran
	fmt.Println("\n🌍 Fetching all Iran-related news...")
	allIranNews, err := newsAPI.GetEverything(EverythingParams{
		Q:        "Iran",
		Language: "en",
		SortBy:   "publishedAt",
		PageSize: 10,
	})
	if err != nil {
		log.Printf("Error fetching all Iran news: %v", err)
	} else {
		fmt.Printf("✅ Found %d total articles about Iran\n", allIranNews.TotalResults)
		displayArticles(allIranNews.Articles, 5)
	}

	// Test 5: Check news sources
	fmt.Println("\n📡 Available news sources...")
	sources, err := newsAPI.GetSources(SourcesParams{
		Language: "en",
		Category: "general",
	})
	if err != nil {
		log.Printf("Error fetching sources: %v", err)
	} else {
		fmt.Printf("✅ Found %d available news sources\n", len(sources.Sources))
		for i, source := range sources.Sources {
			if i >= 5 {
				break
			}
			fmt.Printf("   %d. %s (%s)\n", i+1, source.Name, source.Country)
		}
	}

	fmt.Println("\n==================================================")
	fmt.Println("🎉 NewsAPI testing completed!")
}

func displayArticles(articles []NewsArticle, limit int) {
	if len(articles) == 0 {
		fmt.Println("   No articles found")
		return
	}

	for i, article := range articles {
		if i >= limit {
			break
		}
		fmt.Printf("   %d. %s\n", i+1, article.Title)
		fmt.Printf("      Source: %s | Published: %s\n", article.Source.Name, article.PublishedAt)
		if article.Description != "" {
			description := article.Description
			if len(description) > 100 {
				description = description[:100] + "..."
			}
			fmt.Printf("      %s\n", description)
		}
		fmt.Println()
	}
}
