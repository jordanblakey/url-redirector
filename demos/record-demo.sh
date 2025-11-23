#!/bin/bash

# Directory for recordings
RECORDINGS_DIR="$(dirname "$0")/recordings"
mkdir -p "$RECORDINGS_DIR"

# Extract version from manifest.json
VERSION=$(grep '"version":' "$(dirname "$0")/../manifest.json" | head -n 1 | cut -d '"' -f 4)

# Timestamp for filename
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="$RECORDINGS_DIR/url-redirector-${VERSION}-demo-${TIMESTAMP}.mp4"

# Dimensions
# We record the full 4K display (3840x2160) to capture the entire desktop context.
# The Playwright browser will be positioned at the top-left of this display.
WIDTH=3840
HEIGHT=2160

echo "🎥 Starting Screen Recording..."
echo "   Target: Display :0+0,0 (Top-left corner)"
echo "   Size:   ${WIDTH}x${HEIGHT}"
echo "   Output: $FILENAME"

# Start ffmpeg in the background
# Define the command and flags as an array
ffmpeg_flags=(
    # [Format]: Specifies we are recording the X11 Window System
    -f x11grab 
    # [Resolution]: The dimensions of the grab area
    -video_size "${WIDTH}x${HEIGHT}" 
    # [Input Framerate]: Capture at 60Hz
    -framerate 60 
    # [Input Source]: Display :0.0 with offset
    -i :0.0+3840,0 
    # [Video Codec]: H.264
    -c:v libx264 
    # [Speed]: Sacrifice compression for speed (capture only)
    -preset ultrafast 
    # [Quality]: Visually lossless
    -crf 18 
    # [Filters]: Pixel format and color scaling
    -filter:v "format=yuv420p" 
    # [Overwrite]: Yes
    -y 
)

# Log file for ffmpeg output
LOG_FILE="$RECORDINGS_DIR/ffmpeg_debug.log"
echo "   Log:    $LOG_FILE"

# Execute ffmpeg with the array expanded
ffmpeg "${ffmpeg_flags[@]}" "$FILENAME" > "$LOG_FILE" 2>&1 &

# Save PID of ffmpeg to kill it later
FFMPEG_PID=$!

# Check if ffmpeg died immediately
sleep 1
if ! kill -0 "$FFMPEG_PID" 2>/dev/null; then
    echo "❌ ffmpeg failed to start! Check $LOG_FILE for details."
    cat "$LOG_FILE"
    exit 1
fi

# Wait a moment for recording to initialize
sleep 2

echo "🚀 Launching Playwright Demo..."

# Run the Playwright script
if [ "$1" == "--interactive" ]; then
    npm run headful -- --interactive
else
    npm run headful
fi

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
