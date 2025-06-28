from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import requests
import json
from datetime import datetime
import re

class NewsToFlightInstructions:
    def __init__(self):
        # Initialize sentiment analysis and text classification pipelines
        self.sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest"
        )
        
        self.text_classifier = pipeline(
            "zero-shot-classification",
            model="facebook/bart-large-mnli"
        )
        
        # Define geopolitical risk categories
        self.risk_categories = [
            "military conflict",
            "terrorism threat", 
            "political instability",
            "economic sanctions",
            "natural disaster",
            "airspace closure",
            "diplomatic crisis"
        ]
        
        # Country/region mapping
        self.country_mappings = {
            "iran": "IR", "israel": "IL", "russia": "RU", "ukraine": "UA",
            "china": "CN", "taiwan": "TW", "north korea": "KP", "syria": "SY",
            "afghanistan": "AF", "iraq": "IQ", "yemen": "YE", "lebanon": "LB"
        }

    def fetch_news(self, api_key=None):
        """Fetch current news from multiple sources"""
        news_sources = []
        
        # NewsAPI integration
        if api_key:
            url = f"https://newsapi.org/v2/top-headlines?category=general&language=en&apiKey={api_key}"
            try:
                response = requests.get(url)
                if response.status_code == 200:
                    data = response.json()
                    for article in data.get('articles', [])[:10]:
                        news_sources.append({
                            'title': article['title'],
                            'description': article['description'],
                            'source': article['source']['name'],
                            'published': article['publishedAt']
                        })
            except Exception as e:
                print(f"Error fetching news: {e}")
        
        # Fallback mock news for testing
        if not news_sources:
            news_sources = [
                {
                    'title': 'Israel bombs Iran military facilities',
                    'description': 'Israeli forces conducted airstrikes on Iranian military installations',
                    'source': 'Reuters',
                    'published': datetime.now().isoformat()
                },
                {
                    'title': 'Russia closes airspace over border regions',
                    'description': 'Russian authorities restrict civilian flights near Ukrainian border',
                    'source': 'BBC',
                    'published': datetime.now().isoformat()
                }
            ]
        
        return news_sources

    def analyze_news_item(self, news_item):
        """Analyze a single news item for flight safety implications"""
        text = f"{news_item['title']} {news_item['description']}"
        
        # Classify the type of risk
        classification = self.text_classifier(text, self.risk_categories)
        risk_type = classification['labels'][0]
        risk_confidence = classification['scores'][0]
        
        # Analyze sentiment for severity
        sentiment = self.sentiment_analyzer(text)[0]
        
        # Extract countries/regions mentioned
        affected_regions = self.extract_regions(text)
        
        # Generate flight instructions
        instructions = self.generate_flight_instructions(
            risk_type, risk_confidence, sentiment, affected_regions, news_item
        )
        
        return {
            'news_item': news_item,
            'risk_type': risk_type,
            'risk_confidence': risk_confidence,
            'sentiment': sentiment,
            'affected_regions': affected_regions,
            'flight_instructions': instructions
        }

    def extract_regions(self, text):
        """Extract country/region names from text"""
        text_lower = text.lower()
        found_regions = []
        
        for country, code in self.country_mappings.items():
            if country in text_lower:
                found_regions.append({
                    'name': country.title(),
                    'code': code
                })
        
        return found_regions

    def generate_flight_instructions(self, risk_type, confidence, sentiment, regions, news_item):
        """Generate specific flight path instructions based on analysis"""
        instructions = {
            'timestamp': datetime.now().isoformat(),
            'source_news': news_item['title'],
            'risk_level': self.calculate_risk_level(confidence, sentiment),
            'actions': []
        }
        
        # Generate specific actions based on risk type and regions
        if risk_type == "military conflict" and confidence > 0.7:
            for region in regions:
                instructions['actions'].append({
                    'type': 'avoid_region',
                    'target': region['code'],
                    'reason': f"Military conflict detected in {region['name']}",
                    'radius_km': 500,
                    'duration_hours': 72
                })
        
        elif risk_type == "airspace closure" and confidence > 0.6:
            for region in regions:
                instructions['actions'].append({
                    'type': 'avoid_airspace',
                    'target': region['code'],
                    'reason': f"Airspace restrictions in {region['name']}",
                    'altitude_restriction': True,
                    'duration_hours': 24
                })
        
        elif risk_type == "terrorism threat" and confidence > 0.5:
            for region in regions:
                instructions['actions'].append({
                    'type': 'increase_security',
                    'target': region['code'],
                    'reason': f"Security threat level elevated in {region['name']}",
                    'additional_screening': True,
                    'duration_hours': 48
                })
        
        # Add general precautionary measures
        if sentiment['label'] == 'NEGATIVE' and sentiment['score'] > 0.8:
            instructions['actions'].append({
                'type': 'monitor_situation',
                'reason': 'High negative sentiment detected in news',
                'frequency_hours': 6
            })
        
        return instructions

    def calculate_risk_level(self, confidence, sentiment):
        """Calculate overall risk level"""
        base_risk = confidence
        
        if sentiment['label'] == 'NEGATIVE':
            base_risk += sentiment['score'] * 0.3
        
        if base_risk > 0.8:
            return 'HIGH'
        elif base_risk > 0.6:
            return 'MEDIUM'
        elif base_risk > 0.4:
            return 'LOW'
        else:
            return 'MINIMAL'

    def process_news_batch(self, news_api_key=None):
        """Process multiple news items and generate comprehensive instructions"""
        news_items = self.fetch_news(news_api_key)
        all_instructions = []
        
        for item in news_items:
            try:
                analysis = self.analyze_news_item(item)
                all_instructions.append(analysis)
            except Exception as e:
                print(f"Error processing news item: {e}")
        
        return self.consolidate_instructions(all_instructions)

    def consolidate_instructions(self, analyses):
        """Consolidate multiple analyses into unified flight instructions"""
        consolidated = {
            'timestamp': datetime.now().isoformat(),
            'total_news_analyzed': len(analyses),
            'high_risk_regions': [],
            'consolidated_actions': [],
            'summary': ''
        }
        
        # Group actions by region
        region_actions = {}
        for analysis in analyses:
            for action in analysis['flight_instructions']['actions']:
                target = action.get('target', 'global')
                if target not in region_actions:
                    region_actions[target] = []
                region_actions[target].append(action)
        
        # Create consolidated actions
        for region, actions in region_actions.items():
            if len(actions) > 1:  # Multiple concerns for same region
                consolidated['high_risk_regions'].append(region)
                consolidated['consolidated_actions'].append({
                    'type': 'avoid_region_high_priority',
                    'target': region,
                    'reason': f"Multiple risk factors detected ({len(actions)} incidents)",
                    'duration_hours': max([a.get('duration_hours', 24) for a in actions])
                })
            else:
                consolidated['consolidated_actions'].extend(actions)
        
        return consolidated

