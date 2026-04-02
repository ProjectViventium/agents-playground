# Quick Fix for "Could not establish pc connection"

Based on the server logs showing "could not restart participant", here are the most likely fixes:

## Most Common Fix (Docker Desktop): Set LiveKit `--node-ip`

If LiveKit runs in Docker Desktop (macOS/Windows), it can advertise the container IP (e.g. `172.17.x.x`) as ICE candidates.
Your browser cannot reach that, causing: **"could not establish pc connection"**.

Start LiveKit with:

```bash
docker run -d \
  -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  livekit/livekit-server \
  --dev --bind 0.0.0.0 --node-ip 127.0.0.1
```

If you use `./start_all.sh`, it now applies this automatically via `LIVEKIT_NODE_IP`.

## Most Common Fix: Browser Permissions

**The Issue**: Browser is blocking WebRTC even though you're not using camera/mic.

**The Fix**:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for permission errors
4. Grant camera/microphone permissions when prompted
5. Or manually: Browser Settings → Site Settings → Camera/Microphone → Allow for localhost:3000

## Alternative: Try Different Browser

Some browsers handle localhost WebRTC better:
- **Chrome/Edge**: Usually works best
- **Firefox**: May need additional configuration
- **Safari**: Often has issues with WebRTC

## Check Browser Console

Open DevTools (F12) → Console tab and look for:
- `Permission denied` errors
- `ICE connection failed` errors
- `WebSocket connection failed` errors

These will tell you exactly what's wrong.

## Verify LiveKit Server

```bash
# Check if server is responding
curl http://localhost:7880
# Should return: OK

# Check server logs for errors
docker logs $(docker ps -q --filter ancestor=livekit/livekit-server | head -1) | tail -50
```

## Try Manual Connection Mode

If "env" mode doesn't work:

1. Generate token:
```bash
docker run --rm livekit/livekit-cli token create \
  --dev \
  --identity "test-user" \
  --name "Test" \
  --room "test-room" \
  --join \
  --valid-for "24h" | grep "Access token:" | awk '{print $3}'
```

2. In playground UI:
   - Switch to "Manual" tab
   - URL: `ws://localhost:7880`
   - Token: (paste token from step 1)
   - Click Connect

## Agent Not Connecting (Explicit Dispatch)

If the playground connects but shows **Agent name: None** / **No agent connected**:

- Set **Agent name** to: `viventium`
- This must match `LIVEKIT_AGENT_NAME` used by the Viventium agent worker (explicit dispatch).

## Still Not Working?

See `TROUBLESHOOTING.md` for comprehensive debugging steps.

