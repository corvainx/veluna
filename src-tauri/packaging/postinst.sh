#!/bin/sh
set -e

YTDLP_PATH="/usr/bin/yt-dlp"

echo "Veluna: Checking for conflicting or outdated yt-dlp installations..."

if dpkg -s yt-dlp >/dev/null 2>&1; then
    echo "Veluna: Found an old/conflicting yt-dlp installed via APT."
    echo "Veluna: Removing the APT package to prevent conflicts..."
    
    DEBIAN_FRONTEND=noninteractive apt-get purge -y yt-dlp
    
    DEBIAN_FRONTEND=noninteractive apt-get autoremove -y
else
    echo "Veluna: No APT version of yt-dlp detected."
fi

download_ytdlp() {
    if [ -f "$YTDLP_PATH" ]; then
        echo "Veluna: A standalone yt-dlp binary is already present at $YTDLP_PATH."
        return 0
    fi

    if command -v curl >/dev/null 2>&1; then
        echo "Veluna: Downloading latest yt-dlp via curl..."
        curl -fsSL -o "$YTDLP_PATH" \
            "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"
    elif command -v wget >/dev/null 2>&1; then
        echo "Veluna: Downloading latest yt-dlp via wget..."
        wget -q -O "$YTDLP_PATH" \
            "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"
    else
        echo "Veluna: Neither curl nor wget found — skipping yt-dlp auto-install."
        echo "Veluna: Install yt-dlp manually: https://github.com/yt-dlp/yt-dlp#installation"
        return 1
    fi
}

if download_ytdlp; then
    if [ -f "$YTDLP_PATH" ]; then
        chmod a+rx "$YTDLP_PATH"
        echo "Veluna: Clean yt-dlp binary is ready at $YTDLP_PATH"
    fi
else
    echo "Veluna: yt-dlp download failed (no network?)."
    echo "Veluna: The app will attempt to fetch it on first launch instead."
fi

exit 0