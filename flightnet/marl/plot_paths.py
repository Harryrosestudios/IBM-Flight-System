import matplotlib.pyplot as plt
import csv
import glob
import numpy as np
from PIL import Image
import urllib.request
import io

# List of airports (add more as needed)
airports = [
    ("DEL", 28.5562, 77.1000, "Indira Gandhi Intl Delhi"),
    ("DXB", 25.2532, 55.3657, "Dubai International"),
    ("LHR", 51.4700, -0.4543, "London Heathrow"),
    ("JFK", 40.6413, -73.7781, "New York JFK"),
    # Add more airports here if needed
]

def plot_predicted_paths(path_pattern="flightnet/data/predicted_path_*.csv"):
    plt.figure(figsize=(14, 7))
    # Fix: Load world map image from URL using PIL and urllib
    url = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Equirectangular_projection_SW.jpg/1200px-Equirectangular_projection_SW.jpg"
    with urllib.request.urlopen(url) as response:
        img_file = io.BytesIO(response.read())
    img = np.array(Image.open(img_file))
    plt.imshow(img, extent=[-180, 180, -90, 90], aspect='auto')

    # Plot all airports
    for code, lat, lon, name in airports:
        plt.scatter(lon, lat, c='blue', s=80, edgecolors='k', zorder=5)
        plt.text(lon+1, lat+1, code, fontsize=10, color='blue', zorder=6)

    # Plot predicted paths
    files = sorted(glob.glob(path_pattern))
    colors = ['r', 'g', 'b', 'm', 'c', 'y', 'k']
    for idx, file in enumerate(files):
        lats, lons = [], []
        with open(file, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                lats.append(float(row["lat"]))
                lons.append(float(row["lon"]))
        plt.plot(lons, lats, marker='o', color=colors[idx % len(colors)], label=f"Segment {idx+1}", linewidth=2)

    plt.xlim(-180, 180)
    plt.ylim(-90, 90)
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.title("Predicted Flight Paths on World Map")
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.5)
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    plot_predicted_paths()