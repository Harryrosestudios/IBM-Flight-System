import importlib.util
import os
import sys

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the granite integration module
from granite_integration import GraniteFeatureIntegration

# Mock flight data for testing
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

def test_granite_feature():
    print("🚀 Testing Granite Feature Integration...")
    
    try:
        # Initialize without NEWS_API_KEY to use mock data
        granite = GraniteFeatureIntegration(news_api_key=None)
        
        print("\n📰 Testing News Analysis...")
        instructions = granite.process_news_to_instructions()
        print("✅ News analysis completed")
        print(f"   - Analyzed {instructions['total_news_analyzed']} news items")
        print(f"   - High risk regions: {instructions['high_risk_regions']}")
        
        print("\n📊 Testing Report Generation...")
        report = granite.generate_flight_report(mock_flight_data, instructions)
        print("✅ Report generation completed")
        print(f"   - Report ID: {report['report_id']}")
        print(f"   - Cost impact: ${report['financial_impact']['total_additional_cost_usd']}")
        
        print("\n🔄 Testing Full Pipeline...")
        full_results = granite.full_granite_pipeline(mock_flight_data)
        print("✅ Full pipeline completed")
        
        print("\n📋 Executive Summary:")
        print("-" * 50)
        print(full_results['flight_report']['executive_summary'])
        print("-" * 50)
        
        return True
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_individual_components():
    print("\n🔧 Testing Individual Components...")
    
    try:
        # Test news analyzer
        from news_analyzer import NewsToFlightInstructions
        news_analyzer = NewsToFlightInstructions()
        print("✅ NewsToFlightInstructions imported successfully")
        
        # Test report generator
        from report_generator import FlightPathReportGenerator
        report_gen = FlightPathReportGenerator()
        print("✅ FlightPathReportGenerator imported successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing components: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("GRANITE INTEGRATION TEST SUITE")
    print("=" * 60)
    
    # Test individual components first
    components_ok = test_individual_components()
    
    if components_ok:
        # Test full integration
        integration_ok = test_granite_feature()
        
        if integration_ok:
            print("\n🎉 All tests passed! Granite integration is working correctly.")
        else:
            print("\n⚠️  Integration tests failed. Check error messages above.")
    else:
        print("\n❌ Component tests failed. Check your imports and dependencies.")

