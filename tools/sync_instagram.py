#!/usr/bin/env python3
"""Pull recent @thrivehyperbaric posts into the website feed.

Writes dist/social/feed.json and one cover image per post (dist/social/img/<id>.webp).
Run by .github/workflows/instagram-sync.yml on a schedule; can also be run by hand:

    IG_TOKEN=... IG_USER_ID=... python3 tools/sync_instagram.py

Which page a post appears on comes from dist/social/tags.json:
    {"<post id>": ["home", "commercial"]}   -> shown on those pages (and the homepage)
    {"<post id>": "hide"}                   -> never shown on the site
Untagged posts are not shown (most new posts are project stories, matched below).

It also switches on project stories (dist/stories/stories.json): a story whose caption's
opening matches a live Instagram post gets that post's link and date, which makes it
appear on its pages. A story can also be switched on by hand by setting "instagram". Posts whose caption uses wording that
breaks the Thrive claims rules are hidden automatically, whatever tags.json says.
"""
import io, json, os, re, sys, urllib.parse, urllib.request
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist', 'social')
API = 'https://graph.facebook.com/v21.0'
LIMIT = 30
BANNED = [r'anti-?age?ing', r'reverse the clock', r'\bdetox', r'\bimmun', r'inflammation', r'\bheal(s|ing|ed)?\b',
          r'\btreat(s|ment|ing)?\b', r'\bcure', r'stem cell', r'cancer', r'\bpartner\b']

def get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()

def main():
    token, uid = os.environ['IG_TOKEN'], os.environ['IG_USER_ID']
    q = urllib.parse.urlencode({
        'fields': 'id,caption,permalink,timestamp,media_type,media_url,thumbnail_url,'
                  'children{media_type,media_url,thumbnail_url}',
        'limit': LIMIT, 'access_token': token})
    posts = json.loads(get(f'{API}/{uid}/media?{q}'))['data']
    tags = json.load(open(os.path.join(ROOT, 'tags.json')))
    os.makedirs(os.path.join(ROOT, 'img'), exist_ok=True)
    out = []
    for p in posts:
        cap = p.get('caption') or ''
        t = tags.get(p['id'], 'hide')
        if t == 'hide' or any(re.search(b, cap, re.I) for b in BANNED):
            continue
        src = p
        if p['media_type'] == 'CAROUSEL_ALBUM' and p.get('children'):
            src = p['children']['data'][0]
        url = src.get('thumbnail_url') or src.get('media_url')
        path = os.path.join(ROOT, 'img', p['id'] + '.webp')
        if not os.path.exists(path):
            im = Image.open(io.BytesIO(get(url))).convert('RGB')
            w, h = im.size
            if w / h > 0.8:
                nw = int(h * 0.8); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
            else:
                nh = int(w / 0.8); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
            im.resize((600, 750), Image.LANCZOS).save(path, quality=80)
        # first line of the caption, without reshare credits or hashtags
        first = re.sub(r'Get @reshare_app\s*•\s*@\S+\s*', '', cap).strip().split('\n')[0]
        first = re.sub(r'#\S+', '', first).strip()
        out.append({'id': p['id'], 'permalink': p['permalink'], 'date': p['timestamp'][:10],
                    'type': p['media_type'].lower(), 'img': 'social/img/' + p['id'] + '.webp',
                    'text': first[:140], 'tags': t})
    json.dump(out, open(os.path.join(ROOT, 'feed.json'), 'w'), indent=1, ensure_ascii=False)
    print(f'{len(out)} posts written, {len(posts) - len(out)} hidden')
    match_stories(posts)

def norm(t):
    t = re.sub(r'Get @reshare_app\s*•\s*@\S+\s*', '', t or '')
    return re.sub(r'[^a-z0-9]+', ' ', t.lower()).strip()[:60]

def match_stories(posts):
    path = os.path.join(ROOT, '..', 'stories', 'stories.json')
    stories = json.load(open(path))
    changed = 0
    for s in stories:
        if s.get('instagram'):
            continue
        key = norm(s.get('caption'))
        for p in posts:
            if key and norm(p.get('caption')).startswith(key[:40]):
                s['instagram'] = p['permalink']; s['date'] = p['timestamp'][:10]; changed += 1
                print('switched on:', s['id'], p['permalink'])
                break
    if changed:
        json.dump(stories, open(path, 'w'), indent=1, ensure_ascii=False)

if __name__ == '__main__':
    sys.exit(main())
