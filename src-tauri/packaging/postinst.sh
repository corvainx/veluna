#!/bin/sh
set -e

(
    LIMIT=60
    while [ $LIMIT -gt 0 ]; do
        if flock -n /var/lib/dpkg/lock-frontend true 2>/dev/null; then
            break
        fi
        sleep 1
        LIMIT=$((LIMIT - 1))
    done

    sleep 2

    YTDLP_PATH="/usr/bin/yt-dlp"

    if dpkg -s yt-dlp >/dev/null 2>&1; then
        echo "Veluna: Removing old APT yt-dlp package to prevent conflicts..."
        DEBIAN_FRONTEND=noninteractive apt-get purge -y yt-dlp || true
        DEBIAN_FRONTEND=noninteractive apt-get autoremove -y || true
    fi

    if [ -f "$YTDLP_PATH" ]; then
        rm -f "$YTDLP_PATH"
    fi

    echo "Veluna: Downloading latest yt-dlp binary..."
    DOWNLOAD_SUCCESS=0
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL -o "$YTDLP_PATH" "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp" && DOWNLOAD_SUCCESS=1
    elif command -v wget >/dev/null 2>&1; then
        wget -q -O "$YTDLP_PATH" "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp" && DOWNLOAD_SUCCESS=1
    fi

    if [ $DOWNLOAD_SUCCESS -eq 1 ]; then
        chmod a+rx "$YTDLP_PATH"
        echo "Veluna: yt-dlp binary is ready at $YTDLP_PATH"
    else
        echo "Veluna: Failed to download yt-dlp." >&2
    fi
) >/var/log/veluna-setup.log 2>&1 &

exit 0
