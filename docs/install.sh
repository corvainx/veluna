#!/usr/bin/env bash
set -euo pipefail

DEB_URL="https://github.com/corvainx/veluna/releases/download/v0.1.1/veluna_0.1.1_amd64.deb"
RPM_URL="https://github.com/corvainx/veluna/releases/download/v0.1.1/veluna-0.1.1-1.x86_64.rpm"

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

error() {
  echo -e "\033[1;31mError:\033[0m $1"
  exit 1
}

main() {
  if command -v pacman >/dev/null 2>&1; then
    echo -e "\033[1;32mDetected Arch Linux system.\033[0m"
    sudo pacman -S --needed --noconfirm mpv yt-dlp ffmpeg webkit2gtk-4.1 libayatana-appindicator git base-devel
    git clone https://github.com/corvainx/veluna.git "$TEMP_DIR/veluna"
    cd "$TEMP_DIR/veluna/packaging"
    makepkg -si --noconfirm
    echo -e "\033[1;32mSuccessfully installed Veluna native Arch Linux package!\033[0m"
  elif command -v apt >/dev/null 2>&1; then
    PACKAGE_PATH="$TEMP_DIR/veluna_0.1.1_amd64.deb"
    curl -fsSL# "$DEB_URL" -o "$PACKAGE_PATH" || error "Download failed."
    sudo apt install -y "$PACKAGE_PATH"
  elif command -v dnf >/dev/null 2>&1; then
    PACKAGE_PATH="$TEMP_DIR/veluna-0.1.1-1.x86_64.rpm"
    curl -fsSL# "$RPM_URL" -o "$PACKAGE_PATH" || error "Download failed."
    sudo dnf install -y "$PACKAGE_PATH"
  else
    error "Unsupported package manager. Supported: pacman, apt, dnf."
  fi
}

main
