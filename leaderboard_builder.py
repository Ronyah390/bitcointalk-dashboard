import os
import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime, timedelta
import json
import argparse
from vercel_blob import put
from dotenv import load_dotenv

# Load environment variables for local testing (e.g., from a .env file)
load_dotenv()

# --- CONFIG ---
BASE_URL = "https://bitcointalk.org/index.php?topic=3078328."
HEADERS = {'User-Agent': 'Mozilla/5.0'}

# --- SCRAPING FUNCTIONS ---
def extract_full_snapshot_from_post(post_html):
    post_text = post_html.get_text()
    date_match = re.search(r"\((\d{4}-\d{2}-\d{2}_\w+_\d{2}\.\d{2}h)\)", post_text)
    if not date_match:
        return None
    
    snapshot_date_str = date_match.group(1).split('_')[0]
    merit_file_link_tag = post_html.find('a', href=re.compile(r"all_users_who_earned_Merit.*?\.txt"))
    if not merit_file_link_tag:
        return None
        
    merit_file_url = merit_file_link_tag['href']
    print(f"    -> Found data file: {merit_file_url}")
    
    try:
        file_res = requests.get(merit_file_url, headers=HEADERS, timeout=30)
        file_res.raise_for_status()
        merit_block = file_res.text
    except requests.exceptions.RequestException as e:
        print(f"    ⚠️ Could not download merit file: {e}")
        return None

    pattern = re.compile(r"([\d,]+)\s+Merit received by\s+(.+?)\s+\(#(\d+)\)")
    users = []
    for match in pattern.finditer(merit_block):
        merits, username, user_id = match.groups()
        users.append({
            "username": username.strip(),
            "userId": int(user_id),
            "merits": int(merits.replace(',', ''))
        })
        
    if users:
        return {"date": snapshot_date_str, "users": users}
    return None

def fetch_snapshots(mode='initial'): # Mode is kept for compatibility but logic is now unified
    all_snapshots = []
    # We always need at least 120 days of data for the longest calculation, plus a buffer.
    REQUIRED_HISTORY = datetime.now() - timedelta(days=130)
    print(f"🚀 Fetching snapshots. Will scan pages until data from before {REQUIRED_HISTORY.strftime('%Y-%m-%d')} is found.")
    
    # This logic to find the last page number is smart and remains the same
    last_page_res = requests.get(f"{BASE_URL}99999", headers=HEADERS, timeout=20)
    last_page_soup = BeautifulSoup(last_page_res.text, 'html.parser')
    last_page_num = int(last_page_soup.find_all('a', class_='navPages')[-1].text)
    
    # Loop backwards through pages starting from the most recent one
    for i in range(last_page_num):
        page_offset = (last_page_num - 1 - i) * 20
        if page_offset < 0: continue
        
        url = f"{BASE_URL}{page_offset}"
        print(f"🟡 Scraping page: {url}")
        try:
            res = requests.get(url, headers=HEADERS, timeout=20)
            res.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f"⚠️ Failed to fetch {url}: {e}")
            continue
            
        soup = BeautifulSoup(res.text, 'html.parser')
        posts = soup.find_all('td', class_='td_headerandpost')
        
        page_had_snapshots = False
        oldest_date_on_page = datetime.now()

        for post in posts:
            author_tag = post.find_previous_sibling('td', class_='poster_info')
            if not author_tag or 'LoyceV' not in author_tag.get_text(): continue

            snapshot = extract_full_snapshot_from_post(post)
            if snapshot:
                page_had_snapshots = True
                all_snapshots.append(snapshot)
                current_date = datetime.strptime(snapshot["date"], "%Y-%m-%d")
                if current_date < oldest_date_on_page:
                    oldest_date_on_page = current_date
        
        # If the oldest snapshot on this page is old enough, we can stop.
        if page_had_snapshots and oldest_date_on_page < REQUIRED_HISTORY:
            print(f"ℹ️ Found snapshot from {oldest_date_on_page.strftime('%Y-%m-%d')}. Sufficient history collected. Stopping page scan.")
            break
            
    unique_snapshots = {snap['date']: snap for snap in all_snapshots}.values()
    return sorted(list(unique_snapshots), key=lambda x: x['date'], reverse=True)

def build_and_save_leaderboard(snapshots):
    if not snapshots:
        print("❌ No snapshots found to build a leaderboard.")
        return

    for snapshot in snapshots:
        snapshot['users_dict'] = {user['userId']: user for user in snapshot['users']}
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
        "leaderboard7d": sorted(leaderboard, key=lambda x: x["merit7d"], reverse=True),
        "leaderboard30d": sorted(leaderboard, key=lambda x: x["merit30d"], reverse=True),
        "leaderboard90d": sorted(leaderboard, key=lambda x: x["merit90d"], reverse=True),
        "leaderboard120d": sorted(leaderboard, key=lambda x: x["merit120d"], reverse=True)
    }
    
    try:
        print("⬆️ Uploading leaderboard data to Vercel Blob...")
        blob_result = put(
            'leaderboard_latest.json', 
            json.dumps(final_data).encode('utf-8'),
            options={
                'addRandomSuffix': False, 
                'token': os.environ.get('VERCEL_TOKEN'),
                'allowOverwrite': True
            }
        )
        print(f"✅ Leaderboard successfully uploaded! URL: {blob_result['url']}")
    except Exception as e:
        print(f"❌ Failed to upload to Vercel Blob: {e}")

# --- MAIN EXECUTION ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape and build Bitcointalk merit leaderboards.")
    parser.add_argument('--mode', type=str, default='update', choices=['initial', 'update'])
    args = parser.parse_args()
    
    if not os.environ.get('VERCEL_TOKEN'):
        print("❌ VERCEL_TOKEN environment variable not found. Cannot upload.")
    else:
        snapshots = fetch_snapshots(mode=args.mode)
        build_and_save_leaderboard(snapshots)