from transformers import pipeline, GPT2LMHeadModel, GPT2Tokenizer
import json
from datetime import datetime, timedelta

class FlightPathReportGenerator:
    def __init__(self):
        # Initialize text generation pipeline
        self.text_generator = pipeline(
            "text-generation",
            model="microsoft/DialoGPT-medium",
            tokenizer="microsoft/DialoGPT-medium",
            device=-1  # Use CPU, change to 0 for GPU
        )
        
        # Alternative: Use a more specialized model for reports
        self.summarizer = pipeline(
            "summarization",
            model="facebook/bart-large-cnn"
        )

    def analyze_flight_data(self, flight_paths_data):
        """Analyze flight path data and extract key insights"""
        analysis = {
            'total_flights': len(flight_paths_data.get('flights', [])),
            'avoided_regions': [],
            'alternative_routes': [],
            'fuel_impact': 0,
            'time_impact': 0,
            'safety_measures': [],
            'cost_analysis': {}
        }
        
        for flight in flight_paths_data.get('flights', []):
            # Analyze route changes
            if flight.get('route_modified'):
                analysis['alternative_routes'].append({
                    'flight_id': flight['id'],
                    'original_route': flight.get('original_route'),
                    'new_route': flight.get('modified_route'),
                    'reason': flight.get('modification_reason')
                })
            
            # Track avoided regions
            for avoided in flight.get('avoided_regions', []):
                if avoided not in analysis['avoided_regions']:
                    analysis['avoided_regions'].append(avoided)
            
            # Calculate impacts
            analysis['fuel_impact'] += flight.get('additional_fuel_kg', 0)
            analysis['time_impact'] += flight.get('additional_time_minutes', 0)
        
        return analysis

    def generate_executive_summary(self, analysis, news_context):
        """Generate executive summary using AI"""
        # Prepare context for text generation
        context = f"""
        Flight Operations Summary:
        - Total flights analyzed: {analysis['total_flights']}
        - Regions avoided: {', '.join(analysis['avoided_regions'])}
        - Routes modified: {len(analysis['alternative_routes'])}
        - Additional fuel consumption: {analysis['fuel_impact']} kg
        - Additional flight time: {analysis['time_impact']} minutes
        
        Current geopolitical context: {news_context.get('summary', 'Multiple security concerns')}
        """
        
        # Generate summary using transformer
        prompt = f"Based on the following flight operations data, provide a professional executive summary:\n{context}\n\nExecutive Summary:"
        
        try:
            generated = self.text_generator(
                prompt,
                max_length=200,
                num_return_sequences=1,
                temperature=0.7,
                pad_token_id=50256
            )
            
            summary = generated[0]['generated_text'].split("Executive Summary:")[-1].strip()
        except Exception as e:
            print(f"Error generating AI summary: {e}")
            summary = self.generate_template_summary(analysis, news_context)
        
        return summary

    def generate_template_summary(self, analysis, news_context):
        """Fallback template-based summary"""
        risk_level = news_context.get('risk_level', 'MEDIUM')
        
        summary = f"""
        Flight operations have been adjusted in response to current geopolitical developments. 
        {analysis['total_flights']} flights were analyzed, with {len(analysis['alternative_routes'])} 
        requiring route modifications due to {risk_level.lower()} risk conditions in 
        {', '.join(analysis['avoided_regions'])}. 
        
        The operational impact includes an additional {analysis['fuel_impact']} kg of fuel consumption 
        and {analysis['time_impact']} minutes of flight time. All modifications prioritize passenger 
        safety while minimizing operational disruption.
        """
        
        return summary.strip()

    def generate_detailed_report(self, flight_paths_data, news_instructions):
        """Generate comprehensive human-readable report"""
        analysis = self.analyze_flight_data(flight_paths_data)
        
        report = {
            'report_id': f"FR_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            'generated_at': datetime.now().isoformat(),
            'executive_summary': self.generate_executive_summary(analysis, news_instructions),
            'operational_overview': self.create_operational_overview(analysis),
            'route_modifications': self.detail_route_changes(analysis['alternative_routes']),
            'safety_measures': self.describe_safety_measures(news_instructions),
            'financial_impact': self.calculate_financial_impact(analysis),
            'recommendations': self.generate_recommendations(analysis, news_instructions),
            'appendix': {
                'raw_data_summary': analysis,
                'news_context': news_instructions
            }
        }
        
        return report

    def create_operational_overview(self, analysis):
        """Create operational overview section"""
        return {
            'flights_affected': analysis['total_flights'],
            'regions_avoided': analysis['avoided_regions'],
            'total_route_changes': len(analysis['alternative_routes']),
            'operational_status': 'ADJUSTED' if analysis['total_flights'] > 0 else 'NORMAL',
            'compliance_status': 'COMPLIANT'
        }

    def detail_route_changes(self, alternative_routes):
        """Detail specific route modifications"""
        detailed_changes = []
        
        for route in alternative_routes:
            change_detail = {
                'flight_identifier': route['flight_id'],
                'modification_type': 'ROUTE_DEVIATION',
                'original_path': route['original_route'],
                'modified_path': route['new_route'],
                'justification': route['reason'],
                'approval_status': 'APPROVED',
                'implementation_time': datetime.now().isoformat()
            }
            detailed_changes.append(change_detail)
        
        return detailed_changes

    def describe_safety_measures(self, news_instructions):
        """Describe implemented safety measures"""
        measures = []
        
        for action in news_instructions.get('consolidated_actions', []):
            if action['type'] == 'avoid_region':
                measures.append({
                    'measure_type': 'GEOGRAPHIC_AVOIDANCE',
                    'description': f"Avoiding {action['target']} region",
                    'reason': action['reason'],
                    'duration': f"{action.get('duration_hours', 24)} hours",
                    'effectiveness': 'HIGH'
                })
            elif action['type'] == 'increase_security':
                measures.append({
                    'measure_type': 'ENHANCED_SCREENING',
                    'description': f"Additional security protocols for {action['target']}",
                    'reason': action['reason'],
                    'duration': f"{action.get('duration_hours', 48)} hours",
                    'effectiveness': 'MEDIUM'
                })
        
        return measures

    def calculate_financial_impact(self, analysis):
        """Calculate financial implications"""
        # Rough estimates - you can refine these based on actual costs
        fuel_cost_per_kg = 0.85  # USD per kg of fuel
        time_cost_per_minute = 12.50  # USD per minute of flight time
        
        additional_fuel_cost = analysis['fuel_impact'] * fuel_cost_per_kg
        additional_time_cost = analysis['time_impact'] * time_cost_per_minute
        
        return {
            'additional_fuel_cost_usd': round(additional_fuel_cost, 2),
            'additional_time_cost_usd': round(additional_time_cost, 2),
            'total_additional_cost_usd': round(additional_fuel_cost + additional_time_cost, 2),
            'cost_per_flight_usd': round((additional_fuel_cost + additional_time_cost) / max(analysis['total_flights'], 1), 2)
        }

    def generate_recommendations(self, analysis, news_instructions):
        """Generate actionable recommendations"""
        recommendations = []
        
        if analysis['fuel_impact'] > 1000:
            recommendations.append({
                'priority': 'HIGH',
                'category': 'FUEL_OPTIMIZATION',
                'recommendation': 'Consider fuel hedging strategies to mitigate increased consumption costs',
                'timeline': '1-2 weeks'
            })
        
        if len(analysis['avoided_regions']) > 2:
            recommendations.append({
                'priority': 'MEDIUM',
                'category': 'ROUTE_PLANNING',
                'recommendation': 'Develop contingency route plans for frequently avoided regions',
                'timeline': '2-4 weeks'
            })
        
        if news_instructions.get('risk_level') == 'HIGH':
            recommendations.append({
                'priority': 'HIGH',
                'category': 'MONITORING',
                'recommendation': 'Increase monitoring frequency and establish 24/7 situation room',
                'timeline': 'Immediate'
            })
        
        return recommendations

    def export_report_formats(self, report):
        """Export report in multiple formats"""
        formats = {
            'json': json.dumps(report, indent=2),
            'markdown': self.convert_to_markdown(report),
            'summary': self.create_executive_brief(report)
        }
        
        return formats

    def convert_to_markdown(self, report):
        """Convert report to markdown format"""
        markdown = f"""# Flight Operations Report
**Report ID:** {report['report_id']}  
**Generated:** {report['generated_at']}

## Executive Summary
{report['executive_summary']}

## Operational Overview
- **Flights Affected:** {report['operational_overview']['flights_affected']}
- **Regions Avoided:** {', '.join(report['operational_overview']['regions_avoided'])}
- **Route Changes:** {report['operational_overview']['total_route_changes']}
- **Status:** {report['operational_overview']['operational_status']}

## Financial Impact
- **Additional Fuel Cost:** ${report['financial_impact']['additional_fuel_cost_usd']}
- **Additional Time Cost:** ${report['financial_impact']['additional_time_cost_usd']}
- **Total Additional Cost:** ${report['financial_impact']['total_additional_cost_usd']}

## Recommendations
"""
        
        for rec in report['recommendations']:
            markdown += f"- **{rec['priority']}:** {rec['recommendation']} (Timeline: {rec['timeline']})\n"
        
        return markdown

    def create_executive_brief(self, report):
        """Create a brief executive summary"""
        return {
            'report_id': report['report_id'],
            'status': report['operational_overview']['operational_status'],
            'flights_affected': report['operational_overview']['flights_affected'],
            'total_cost_impact': report['financial_impact']['total_additional_cost_usd'],
            'key_message': report['executive_summary'][:200] + "...",
            'action_required': len([r for r in report['recommendations'] if r['priority'] == 'HIGH']) > 0
        }

