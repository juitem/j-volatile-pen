#!/usr/bin/env bash
set -e

PLUGIN_ID="j-volatile-pen"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCS_DIR="$HOME/Documents"

echo "Building plugin..."
cd "$SCRIPT_DIR"
npm run build

echo ""
echo "Finding Obsidian vaults in $DOCS_DIR..."

# Collect directories that contain .obsidian folder
vaults=()
for dir in "$DOCS_DIR"/*/; do
    if [ -d "${dir}.obsidian" ]; then
        vaults+=("${dir%/}")
    fi
done

if [ ${#vaults[@]} -eq 0 ]; then
    echo "No Obsidian vaults found in $DOCS_DIR"
    exit 1
fi

# Show selection menu
echo ""
for i in "${!vaults[@]}"; do
    echo "  [$((i+1))] $(basename "${vaults[$i]}")"
done
echo ""
read -rp "Select vault (1-${#vaults[@]}): " choice

if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt ${#vaults[@]} ]; then
    echo "Invalid selection"
    exit 1
fi

vault="${vaults[$((choice-1))]}"
target="$vault/.obsidian/plugins/$PLUGIN_ID"

echo ""
echo "Installing to: $target"
mkdir -p "$target"
cp "$SCRIPT_DIR/main.js" "$target/"
cp "$SCRIPT_DIR/manifest.json" "$target/"
cp "$SCRIPT_DIR/styles.css" "$target/"

echo "Done. Reload Obsidian to apply."
