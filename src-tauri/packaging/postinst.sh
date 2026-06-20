#!/bin/sh
set -e

LIMIT=60
while [ $LIMIT -gt 0 ]; do
    flock -n /var/lib/dpkg/lock-frontend true 2>/dev/null && break
    sleep 1
    LIMIT=$((LIMIT - 1))
done

sleep 2

YTDLP_PATH="/usr/bin/yt-dlp"
YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"

if dpkg -s yt-dlp >/dev/null 2>&1; then
    echo "Veluna: Removing old APT yt-dlp package..."
    DEBIAN_FRONTEND=noninteractive apt-get purge -y yt-dlp || true
    DEBIAN_FRONTEND=noninteractive apt-get autoremove -y || true
fi

rm -f "$YTDLP_PATH"

echo "Veluna: Downloading latest yt-dlp binary..."

if command -v curl >/dev/null 2>&1; then
    curl -fL -o "$YTDLP_PATH" "$YTDLP_URL"
elif command -v wget >/dev/null 2>&1; then
    wget -O "$YTDLP_PATH" "$YTDLP_URL"
else
    echo "Veluna: Neither curl nor wget is available." >&2
    exit 1
fi

chmod a+rx "$YTDLP_PATH"
echo "Veluna: yt-dlp binary is ready at $YTDLP_PATH"

exit 0