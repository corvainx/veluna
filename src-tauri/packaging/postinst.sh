#!/bin/sh
set -e

YTDLP_PATH="/usr/local/bin/yt-dlp"
YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"

mkdir -p "$(dirname "$YTDLP_PATH")"
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
