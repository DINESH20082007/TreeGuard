"""
Script to update all existing SQLite records in treeguard.db to Coimbatore locations.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "treeguard.db")

COIMBATORE_TREES = [
    {
        "id": "TRE-0481",
        "location_name": "DB Road, RS Puram, Coimbatore",
        "latitude": 11.0086,
        "longitude": 76.9489,
    },
    {
        "id": "TRE-0392",
        "location_name": "NSR Road, Saibaba Colony, Coimbatore",
        "latitude": 11.0286,
        "longitude": 76.9450,
    },
    {
        "id": "TRE-0558",
        "location_name": "Race Course Road Promenade, Coimbatore",
        "latitude": 11.0020,
        "longitude": 76.9730,
    },
    {
        "id": "TRE-0612",
        "location_name": "Cross Cut Road, Gandhipuram, Coimbatore",
        "latitude": 11.0183,
        "longitude": 76.9667,
    },
    {
        "id": "TRE-0403",
        "location_name": "Avinashi Road, Peelamedu, Coimbatore",
        "latitude": 11.0270,
        "longitude": 77.0100,
    },
    {
        "id": "TRE-0519",
        "location_name": "Trichy Road, Singanallur, Coimbatore",
        "latitude": 10.9980,
        "longitude": 77.0260,
    },
    {
        "id": "TRE-0631",
        "location_name": "Perur Main Road, Ukkadam, Coimbatore",
        "latitude": 10.9900,
        "longitude": 76.9600,
    },
    {
        "id": "TRE-0488",
        "location_name": "Marudhamalai Road, Vadavalli, Coimbatore",
        "latitude": 11.0250,
        "longitude": 76.9050,
    },
    {
        "id": "TRE-0720",
        "location_name": "IT Park Road, Saravanampatti, Coimbatore",
        "latitude": 11.0800,
        "longitude": 76.9950,
    },
    {
        "id": "TRE-0814",
        "location_name": "SITRA Airport Road, Kalapatti, Coimbatore",
        "latitude": 11.0700,
        "longitude": 77.0350,
    },
    {
        "id": "TRE-0902",
        "location_name": "Palakkad Road, Kuniyamuthur, Coimbatore",
        "latitude": 10.9550,
        "longitude": 76.9450,
    },
    {
        "id": "TRE-0955",
        "location_name": "Mettupalayam Road, Thudiyalur, Coimbatore",
        "latitude": 11.0780,
        "longitude": 76.9350,
    },
]

def update_db():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}, skipping local update.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Update trees
    for item in COIMBATORE_TREES:
        cursor.execute(
            "UPDATE trees SET location_name = ?, latitude = ?, longitude = ? WHERE id = ?",
            (item["location_name"], item["latitude"], item["longitude"], item["id"])
        )
    print(f"Updated {len(COIMBATORE_TREES)} trees to Coimbatore coordinates.")

    # 2. Update users default district
    cursor.execute(
        "UPDATE users SET primary_district = 'RS Puram, Coimbatore' WHERE primary_district = 'Downtown District' OR primary_district IS NULL"
    )
    print("Updated users primary_district.")

    # 3. Update assignments with old locations
    cursor.execute(
        "UPDATE inspector_assignments SET location_name = 'Race Course Road Promenade, Coimbatore', latitude = 11.0020, longitude = 76.9730 WHERE location_name LIKE '%Central Park%'"
    )
    cursor.execute(
        "UPDATE inspector_assignments SET location_name = 'DB Road, RS Puram, Coimbatore', latitude = 11.0086, longitude = 76.9489 WHERE location_name LIKE '%Oak Ave%'"
    )
    cursor.execute(
        "UPDATE inspector_assignments SET location_name = 'NSR Road, Saibaba Colony, Coimbatore', latitude = 11.0286, longitude = 76.9450 WHERE location_name LIKE '%Riverside%'"
    )
    cursor.execute(
        "UPDATE inspector_assignments SET location_name = 'Cross Cut Road, Gandhipuram, Coimbatore', latitude = 11.0183, longitude = 76.9667 WHERE location_name LIKE '%University Ave%'"
    )
    print("Updated inspector_assignments locations.")

    conn.commit()
    conn.close()
    print("Database location update completed successfully.")

if __name__ == "__main__":
    update_db()
