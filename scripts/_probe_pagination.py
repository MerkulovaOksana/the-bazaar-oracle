import re, urllib.request, json
UA = "BattleOracleProbe/1.0"
req = urllib.request.Request("https://bazaardb.gg/search?c=monsters", headers={"User-Agent": UA})
html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8")
print("len html:", len(html))
for tag in ("__NEXT_DATA__", "self.__next_f", "application/json", "<script"):
    idx = html.find(tag)
    print(f"  find '{tag}' -> {idx}")
# Try to extract any JSON blobs that look big.
print("\nSample first 1200 chars:\n", html[:1200])
