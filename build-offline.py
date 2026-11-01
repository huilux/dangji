"""Build a portable preview from the same tested static application."""
import base64
import json
from pathlib import Path

root = Path(__file__).resolve().parent
dist = root / 'dist'
html = (dist / 'index.html').read_text()
app = (dist / 'app.mjs').read_text()
logic = (dist / 'logic.mjs').read_text().replace('export ', '')
items = json.loads((dist / 'produce.json').read_text())
photos = json.loads((dist / 'photos.json').read_text())
cities = json.loads((dist / 'cities.json').read_text())
assert items and len(items) == len(photos)
assert {item['id'] for item in items} == {photo['id'] for photo in photos}

for photo in photos:
    photo['dataUrl'] = 'data:image/jpeg;base64,' + base64.b64encode((dist / 'assets' / photo['file']).read_bytes()).decode()

old_src = 'src="assets/${escape(photo.file.split(\'/\').at(-1))}"'
assert app.count(old_src) == 1
app = app.replace(old_src, 'src="${photo.dataUrl}"')
import_line = "import {filterProduce, monthLabel, nearestCity, readViewState, vegetableGroups} from './logic.mjs?v=3';"
assert import_line in app
app = app.replace(import_line, logic)
load_start = app.index('async function loadJson(name) {')
load_end = app.index('\n}\n',load_start)+2
app = app[:load_start]+"const offlineData = JSON.parse(document.getElementById('offline-data').textContent);\nasync function loadJson(name) {return offlineData[name];}"+app[load_end:]
payload = json.dumps({'produce.json':items, 'photos.json':photos, 'cities.json':cities}, ensure_ascii=False).replace('<', '\\u003c')
html = html.replace('<script type="module" src="app.mjs?v=4"></script>', f'<script id="offline-data" type="application/json">{payload}</script><script type="module">{app}</script>')
html = html.replace('<link rel="stylesheet" href="style.css?v=4">', '<style>' + (dist / 'style.css').read_text() + '</style>')
mark = 'data:image/svg+xml;base64,' + base64.b64encode((dist / 'assets/mark.svg').read_bytes()).decode()
html = html.replace('assets/mark.svg', mark)
license_url = 'data:text/plain;base64,' + base64.b64encode((dist / 'licenses/city-geo-LICENSE.txt').read_bytes()).decode()
html = html.replace('href="licenses/city-geo-LICENSE.txt"', f'href="{license_url}" download="city-geo-LICENSE.txt"')
html = html.replace('href="./"', 'href="?"')
assert 'src="app.mjs?v=4"' not in html and 'href="style.css?v=4"' not in html
(root / 'preview.html').write_text(html)
print(f'Portable preview: {root / "preview.html"} ({len(html.encode()) / 1024 / 1024:.2f} MiB)')
