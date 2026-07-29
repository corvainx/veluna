#!/usr/bin/env bash
set -euo pipefail

DEB_URL="https://github.com/corvainx/veluna/releases/download/v0.1.0/veluna_0.1.0_amd64.deb"
RPM_URL="https://github.com/corvainx/veluna/releases/download/v0.1.0/veluna-0.1.0-1.x86_64.rpm"

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

error() {
  echo -e "\033[1;31mError:\033[0m $1"
  exit 1
}

main() {
  if command -v apt >/dev/null 2>&1; then
    PACKAGE_PATH="$TEMP_DIR/veluna_0.1.0_amd64.deb"
    curl -fsSL# "$DEB_URL" -o "$PACKAGE_PATH" || error "Download failed."
    sudo apt install -y "$PACKAGE_PATH"
  elif command -v dnf >/dev/null 2>&1; then
    PACKAGE_PATH="$TEMP_DIR/veluna-0.1.0-1.x86_64.rpm"
    curl -fsSL# "$RPM_URL" -o "$PACKAGE_PATH" || error "Download failed."
    sudo dnf install -y "$PACKAGE_PATH"
  else
    error "Unsupported package manager. Supported: apt, dnf."
  fi
}

main
