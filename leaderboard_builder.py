import os
import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime, timedelta
import json
import argparse
from vercel_blob import put # --- CHANGE: Import Vercel Blob
from dotenv import load_dotenv # --- CHANGE: To handle local testing

# --- CHANGE: Load environment variables for local testing ---
load_dotenv()

# --- (The scraping and leaderboard building functions are the same as before) ---
# --- CONFIG, extract_full_snapshot_from_post, fetch_snapshots ---
# (These functions are identical to the previous version, so they are omitted here for brevity)
# (Please copy them from the previous script version)

def build_and_save_leaderboard(snapshots):
    if not snapshots:
        print("❌ No snapshots found to build a leaderboard.")
        return

    # ... (The entire calculation logic is identical to the previous version) ...
    for snapshot in snapshots: snapshot['users_dict'] = {user['userId']: user for user in snapshot['users']}
    latest = snapshots[0]
    date_latest = datetime.strptime(latest["date"], "%Y-%m-%d")
    def find_snapshot_closest_to(days_ago):
        target_date = date_latest - timedelta(days=days_ago)
        return min(snapshots, key=lambda x: abs(datetime.strptime(x['date'], "%Y-%m-%d") - target_date))
    snapshot_7d, snapshot_30d, snapshot_90d, snapshot_120d = find_snapshot_closest_to(7), find_snapshot_closest_to(30), find_snapshot_closest_to(90), find_snapshot_closest_to(120)
    print(f"ℹ️ Using snapshots for comparison: 7d -> {snapshot_7d['date']}, 120d -> {snapshot_120d['date']}")
    leaderboard = []
    for user_id, user_data in latest['users_dict'].items():
        current_merit = user_data["merits"]
        def delta(older_snapshot):
            if not older_snapshot: return 0
            prev_user = older_snapshot['users_dict'].get(user_id)
            return current_merit - prev_user["merits"] if prev_user else current_merit
        leaderboard.append({ "username": user_data["username"], "userId": user_id, "currentMerit": current_merit, "merit7d": delta(snapshot_7d), "merit30d": delta(snapshot_30d), "merit90d": delta(snapshot_90d), "merit120d": delta(snapshot_120d) })
    
    final_data = {
        "lastUpdated": datetime.now().isoformat(),
        "leaderboard7d": sorted(leaderboard, key=lambda x: x["merit7d"], reverse=True)[:200],
        "leaderboard30d": sorted(leaderboard, key=lambda x: x["merit30d"], reverse=True)[:200],
        "leaderboard90d": sorted(leaderboard, key=lambda x: x["merit90d"], reverse=True)[:200],
        "leaderboard120d": sorted(leaderboard, key=lambda x: x["merit120d"], reverse=True)[:200]
    }
    
    # --- CHANGE: Upload the final data to Vercel Blob ---
    try:
        print("⬆️ Uploading leaderboard data to Vercel Blob...")
        # The 'pathname' is the name of the file in the blob store.
        # 'addRandomSuffix: False' ensures the URL is always the same.
        blob_result = put(
            'leaderboard_latest.json', 
            json.dumps(final_data, indent=2), 
            options={'addRandomSuffix': False, 'token': os.environ.get('VERCEL_TOKEN')}
        )
        print(f"✅ Leaderboard successfully uploaded! URL: {blob_result['url']}")
    except Exception as e:
        print(f"❌ Failed to upload to Vercel Blob: {e}")

# --- MAIN EXECUTION ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape and build Bitcointalk merit leaderboards.")
    parser.add_argument('--mode', type=str, default='initial', choices=['initial', 'update'])
    args = parser.parse_args()
    
    # --- IMPORTANT: Ensure the VERCEL_TOKEN is available ---
    if not os.environ.get('VERCEL_TOKEN'):
        print("❌ VERCEL_TOKEN environment variable not found. Cannot upload.")
    else:
        snapshots = fetch_snapshots(mode=args.mode)
        build_and_save_leaderboard(snapshots)