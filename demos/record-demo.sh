#!/bin/bash

# Directory for recordings
RECORDINGS_DIR="$(dirname "$0")/recordings"
mkdir -p "$RECORDINGS_DIR"

# Timestamp for filename
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="$RECORDINGS_DIR/full-screen-demo_$TIMESTAMP.mp4"

# Dimensions (matching the Playwright script's padded 1080p window)
# 1920 + 20 padding = 1940
# 1080 + 120 padding = 1200
WIDTH=3840
HEIGHT=2160

echo "🎥 Starting Screen Recording..."
echo "   Target: Display :0+0,0 (Top-left corner)"
echo "   Size:   ${WIDTH}x${HEIGHT}"
echo "   Output: $FILENAME"

# Start ffmpeg in the background
# -f x11grab: Grab X11 display
# -video_size: Size to grab
# -framerate 30: Smooth 30fps
# -i :0.0+0,0: Input display + offset
# -c:v libx264: H.264 codec (much faster than VP9 for capture)
# -preset ultrafast: Minimal CPU usage to prevent frame drops
# -crf 18: High quality (visually lossless)
# -pix_fmt yuv420p: Ensure compatibility with most players
# -y: Overwrite if exists
ffmpeg -f x11grab \
    -video_size "${WIDTH}x${HEIGHT}" \
    -framerate 60 \
    -i :0.0+3840,0 \
    -c:v libx264 -preset ultrafast -crf 18 -pix_fmt yuv420p \
    -y "$FILENAME" > /dev/null 2>&1 &

# Save PID of ffmpeg to kill it later
FFMPEG_PID=$!

# Wait a moment for recording to initialize
sleep 2

echo "🚀 Launching Playwright Demo..."

# Run the Playwright script
# We pass --hq to ensure it uses the 1080p resolution that matches our recording crop
npm run headful -- --hq

# Capture the exit code of the node script
EXIT_CODE=$?

echo "🛑 Stopping Recording..."

# Kill ffmpeg gracefully (SIGINT allows it to finalize the file)
kill -SIGINT "$FFMPEG_PID"

# Wait for ffmpeg to finish saving
wait "$FFMPEG_PID"

echo "✅ Demo Complete!"
echo "   Video saved to: $FILENAME"

exit $EXIT_CODE
