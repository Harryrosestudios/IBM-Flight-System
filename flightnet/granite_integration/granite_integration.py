from news_analyzer import NewsToFlightInstructions
from report_generator import FlightPathReportGenerator
import json
import os
from datetime import datetime
from dotenv import load_dotenv
load_dotenv("project.env")  # Load environment variables from .env file
class GraniteFeatureIntegration:
    def __init__(self, news_api_key=None):
        self.news_analyzer = NewsToFlightInstructions()
        self.report_generator = FlightPathReportGenerator()
        self.news_api_key = news_api_key

    def process_news_to_instructions(self):
        """Process current news and generate flight instructions"""
        print("🔍 Analyzing current news for flight safety implications...")
        
        # Get consolidated instructions from news
        instructions = self.news_analyzer.process_news_batch(self.news_api_key)
        
        print(f"✅ Analyzed {instructions['total_news_analyzed']} news items")
        print(f"🚨 High risk regions: {instructions['high_risk_regions']}")
        
        return instructions

    def generate_flight_report(self, flight_paths_data, news_instructions):
        """Generate human-readable report from flight path data"""
        print("📊 Generating comprehensive flight operations report...")
        
        # Generate detailed report
        report = self.report_generator.generate_detailed_report(
            flight_paths_data, news_instructions
        )
        
        print(f"📋 Report generated: {report['report_id']}")
        print(f"💰 Total cost impact: ${report['financial_impact']['total_additional_cost_usd']}")
        
        return report

    def full_granite_pipeline(self, flight_paths_data):
        """Run complete granite feature pipeline"""
        print("🚀 Starting Granite Feature Pipeline...")
        
        # Step 1: Analyze news and generate instructions
        news_instructions = self.process_news_to_instructions()
        
        # Step 2: Generate human-readable report
        flight_report = self.generate_flight_report(flight_paths_data, news_instructions)
        
        # Step 3: Export in multiple formats
        report_formats = self.report_generator.export_report_formats(flight_report)
        
        return {
            'news_instructions': news_instructions,
            'flight_report': flight_report,
            'report_formats': report_formats,
            'pipeline_completed_at': datetime.now().isoformat()
        }

# Example usage
if __name__ == "__main__":
    # Initialize granite feature
    granite = GraniteFeatureIntegration(news_api_key=os.getenv('NEWS'))
    
    # Mock flight paths data (replace with your actual data)
    mock_flight_data = {
        'flights': [
            {
                'id': 'AA123',
                'route_modified': True,
                'original_route': 'JFK-LHR',
                'modified_route': 'JFK-CDG-LHR',
                'modification_reason': 'Avoiding Iranian airspace due to military conflict',
                'avoided_regions': ['IR'],
                'additional_fuel_kg': 250,
                'additional_time_minutes': 45
            },
            {
                'id': 'BA456',
                'route_modified': True,
                'original_route': 'LHR-DXB',
                'modified_route': 'LHR-CAI-DXB',
                'modification_reason': 'Security concerns in region',
                'avoided_regions': ['IR', 'IQ'],
                'additional_fuel_kg': 180,
                'additional_time_minutes': 30
            }
        ]
    }
    
    # Run full pipeline
    results = granite.full_granite_pipeline(mock_flight_data)
    
    # Print results
    print("\n" + "="*50)
    print("GRANITE FEATURE RESULTS")
    print("="*50)
    print(json.dumps(results['flight_report']['executive_summary'], indent=2))

