#!/bin/bash

# This script navigates you to the studio initialization page
# Run it to automatically initialize your studio profile

echo "🚀 Navigating to studio initialization page..."

# Check if 'open' command exists (macOS/Linux)
if command -v open &> /dev/null; then
  open "http://localhost:3001/studio/init-studio-auto"
# Check if 'xdg-open' command exists (Linux)
elif command -v xdg-open &> /dev/null; then
  xdg-open "http://localhost:3001/studio/init-studio-auto"
# Check if 'start' command exists (Windows)
elif command -v start &> /dev/null; then
  start "http://localhost:3001/studio/init-studio-auto"
else
  echo "Cannot automatically open browser."
  echo "Please visit this URL manually: http://localhost:3001/studio/init-studio-auto"
fi

echo "✅ The page should now open in your browser."
echo "This will automatically initialize your studio profile."
echo "After initialization completes, you should be able to access projects."