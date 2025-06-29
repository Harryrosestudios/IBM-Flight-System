from transformers import pipeline
from datetime import datetime
import requests
import re

class NewsToFlightInstructions:
    def __init__(self):
        # Use Granite for all NLP tasks via prompting
        self.granite_pipe = pipeline(
            task="text-generation",
            model="ibm-granite/granite-3.3-2b-base",
            torch_dtype="auto",
            device=0  # or -1 for CPU
        )

        self.risk_categories = [
            "military conflict",
            "terrorism threat", 
            "political instability",
            "economic sanctions",
            "natural disaster",
            "airspace closure",
            "diplomatic crisis"
        ]
        self.country_mappings = {
            "iran": "IR", "israel": "IL", "russia": "RU", "ukraine": "UA",
            "china": "CN", "taiwan": "TW", "north korea": "KP", "syria": "SY",
            "afghanistan": "AF", "iraq": "IQ", "yemen": "YE", "lebanon": "LB"
        }

    def fetch_news(self, api_key=None):
        news_sources = []
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
        text = f"{news_item['title']} {news_item['description']}"

        # Granite for zero-shot classification
        prompt_cls = (
            f"Classify the following news into one of these categories: {', '.join(self.risk_categories)}.\n"
            f"News: {text}\n"
            f"Category:"
        )
        cls_result = self.granite_pipe(prompt_cls, max_new_tokens=10)[0]['generated_text']
        risk_type = self._extract_first_label(cls_result, self.risk_categories)
        risk_confidence = 0.9  # Granite doesn't return a score, so use a high default or estimate from prompt if needed

        # Granite for sentiment analysis
        prompt_sent = (
            f"Analyze the sentiment of this news as POSITIVE, NEGATIVE, or NEUTRAL.\n"
            f"News: {text}\n"
            f"Sentiment:"
        )
        sent_result = self.granite_pipe(prompt_sent, max_new_tokens=5)[0]['generated_text']
        sentiment_label = self._extract_first_label(sent_result, ["POSITIVE", "NEGATIVE", "NEUTRAL"])
        sentiment_score = 0.9 if sentiment_label == "NEGATIVE" else 0.7  # Dummy confidence

        sentiment = {'label': sentiment_label, 'score': sentiment_score}
        affected_regions = self.extract_regions(text)
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

    def _extract_first_label(self, text, labels):
        text_lower = text.lower()
        for label in labels:
            if label.lower() in text_lower:
                return label
        return labels[0]

    def extract_regions(self, text):
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
        instructions = {
            'timestamp': datetime.now().isoformat(),
            'source_news': news_item['title'],
            'risk_level': self.calculate_risk_level(confidence, sentiment),
            'actions': []
        }
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
        if sentiment['label'] == 'NEGATIVE' and sentiment['score'] > 0.8:
            instructions['actions'].append({
                'type': 'monitor_situation',
                'reason': 'High negative sentiment detected in news',
                'frequency_hours': 6
            })
        return instructions

    def calculate_risk_level(self, confidence, sentiment):
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
        consolidated = {
            'timestamp': datetime.now().isoformat(),
            'total_news_analyzed': len(analyses),
            'high_risk_regions': [],
            'consolidated_actions': [],
            'summary': ''
        }
        region_actions = {}
        for analysis in analyses:
            for action in analysis['flight_instructions']['actions']:
                target = action.get('target', 'global')
                if target not in region_actions:
                    region_actions[target] = []
                region_actions[target].append(action)
        for region, actions in region_actions.items():
            if len(actions) > 1:
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

