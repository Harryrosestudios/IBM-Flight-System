import numpy as np 
import pandas as pd 
import folium
from flask import Flask, render_template_string, request
import requests

#Normalize the input data
def normalize_airport_data(data):
    """
    Loads airport data from various sources and normalizes it into a DataFrame.

    Parameters:
    - data: str (file path) or dict or list

    Returns:
    - pd.DataFrame
    """
    # If data is a string -> assume file path
    if isinstance(data, str):
        if data.lower().endswith('.json'):
            df = pd.read_json(data)
        elif data.lower().endswith('.csv'):
            df = pd.read_csv(data)
        elif data.lower().endswith(('.xlsx', '.xls', '.xlsm')):
            df = pd.read_excel(data)
        else:
            raise ValueError("Unsupported file type. Supported: .json, .csv, .xlsx, .xls, .xlsm")
    
    # If data is dict or list -> convert to DataFrame
    elif isinstance(data, dict):
        df = pd.DataFrame([data]) if not isinstance(next(iter(data.values())), list) else pd.DataFrame(data)
    elif isinstance(data, list):
        df = pd.DataFrame(data)
    else:
        raise ValueError("Unsupported data type. Must be file path, dict, or list.")
    
    # Ensure required columns exist
    required_cols = ['airport_id', 'name', 'lat', 'lon', 'fuel_price', 'landing_fee', 'country']
    for col in required_cols:
        if col not in df.columns:
            df[col] = np.nan
    
    return df

#Initialize the Map Set up
def create_base_map(map_style="OpenStreetMap"):
    base_map = folium.Map(location=[0,0], zoom_start=2, tiles=map_style, max_zoom = 10, min_zoom =2)
    return base_map

#Add Markers
def add_airport_markers(base_map, airport_df, lat_col="lat", lon_col="lon"):
    
    # Define colors for airport types
    type_colors = {
        "departure": "blue",
        "arrival": "red",
        "hub": "purple",
        "unknown": "blue",
        
    }
    
    for _, row in airport_df.iterrows():
        name = row.get("airport_name", "Unknown")
        city = row.get("city", "")
        airport_type = str(row.get("type", "unkown")).lower()
        #location = row.get("location", "")
        country = row.get("country", "")
        
        popup_text = f"""
        <b>Airport Name: {name}</b> {airport_type.title()}<br>
        Location:{country}, ({city})<br>
        """
        
        # Get color for type, default to blue if not matched
        color = type_colors.get(airport_type, "blue")
        
        folium.CircleMarker(
            location=[row[lat_col], row[lon_col]],
            radius=6,
            color=color,
            fill=True,
            fill_color=color,
            fill_opacity=0.7,
            popup=folium.Popup(popup_text, max_width=250)
        ).add_to(base_map)
    
    return base_map

#Draw flight paths
def add_flight_paths(base_map, airport_df, color="red"):
    # Ensure route_order is assigned
    if 'route_order' not in airport_df.columns or airport_df['route_order'].isnull().all():
        airport_df['route_order'] = airport_df['type'].map({
            'departure': 1,
            'hub': 2,
            'arrival': 5
        }).fillna(99)
    else:
        # Fill only where route_order is missing
        airport_df['route_order'] = airport_df.apply(
            lambda row: (
                1 if row['type'] == 'departure' else
                2 if row['type'] == 'hub' else
                5 if row['type'] == 'arrival' else
                99
            ) if pd.isnull(row['route_order']) else row['route_order'],
            axis=1
        )
    
    # Sort points in route order
    path_df = airport_df.sort_values(by="route_order")
    
    # Extract coordinates
    coords = path_df[["lat", "lon"]].values.tolist()
    
    # Add polyline with dotted style
    folium.PolyLine(
        locations=coords,
        color=color,
        weight=2,
        opacity=0.7,
        #dash_array="5, 10"
        #uncomment for dotted line
    ).add_to(base_map)
    
    return base_map

#Main function
def build_airport_map(data, style="OpenStreetMap"):
    base_map = create_base_map(map_style="OpenStreetMap")
    airport_df = normalize_airport_data(data)
    add_airport_markers(base_map, airport_df)
    add_flight_paths(base_map, airport_df)
    #add_reset_button(base_map)  # Implement this part depending on Folium/JS support
    folium.LayerControl().add_to(base_map)
    return base_map

# Flask app setup
app = Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    # Default view (can be a form or info page)
    html = """
    <html>
    <head><title>Airline Route Visualization</title></head>
    <body>
        <h1>Upload Airport Data (JSON)</h1>
        <form action='/map' method='post' enctype='application/json'>
            <textarea name='json_data' rows='20' cols='80' placeholder='Paste JSON data here'></textarea><br>
            <input type='submit' value='Show Map'>
        </form>
    </body>
    </html>
    """
    return render_template_string(html)

@app.route('/map', methods=['POST'])
def map_view():
    # Accept JSON data from form or direct POST
    if request.is_json:
        data = request.get_json()
    else:
        # Fallback: get from form textarea
        # This assumes the form sends JSON data in a textarea named 'json_data'
        json_data = request.form.get('json_data', None)
        if not json_data:
            return 'No data provided', 400
        import json
        try:
            data = json.loads(json_data)
        except Exception as e:
            return f'Invalid JSON: {e}', 400
    folium_map = build_airport_map(data)
    map_html = folium_map._repr_html_()
    html = f"""
    <html>
    <head><title>Airport Map</title></head>
    <body>
        <h1>Airport Map (Dynamic)</h1>
        {map_html}
        <br><a href='/'>Back</a>
    </body>
    </html>
    """
    return render_template_string(html)

if __name__ == "__main__":
    app.run(debug=True)