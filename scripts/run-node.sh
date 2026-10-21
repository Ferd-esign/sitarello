#!/bin/bash
if command -v node >/dev/null 2>&1; then
    exec node "$@"
elif [ -f "/Applications/Antigravity IDE.app/Contents/MacOS/Electron" ]; then
    export ELECTRON_RUN_AS_NODE=1
    exec "/Applications/Antigravity IDE.app/Contents/MacOS/Electron" "$@"
else
    echo "Error: Node.js non trovato nel sistema né nell'IDE." >&2
    exit 1
fi
