# Troubleshooting LiveKit Playground Connection Issues

## "Could not establish pc connection" Error

This error indicates a WebRTC peer connection failure. Here are the most common causes and solutions:

### 0. Docker Desktop (macOS/Windows): LiveKit Advertising Container IP (MOST COMMON)

**Symptom**: The playground connects/signals, but WebRTC fails with `"could not establish pc connection"` / ICE stuck at `checking`.

**Root cause**: When LiveKit runs inside Docker, it can advertise the **container IP** (e.g. `172.17.x.x`) as ICE candidates.
Your browser cannot reach that IP from the host network namespace.

**Fix**: Start LiveKit with a host-reachable `--node-ip`:

```bash
docker run -d \
  -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  livekit/livekit-server \
  --dev --bind 0.0.0.0 --node-ip 127.0.0.1
```

If you use `./start_all.sh`, it now sets `LIVEKIT_NODE_IP=127.0.0.1` and passes `--node-ip` automatically.

### 1. Browser Media Permissions

**Problem**: Browser blocks WebRTC even if you're not using camera/mic.

**Solution**:
- Open browser settings → Privacy → Site Settings
- Allow camera and microphone for `localhost:3000`
- Or use a browser that allows localhost by default (Chrome/Edge)

**Quick Test**: Open browser console (F12) and check for permission errors.

### 2. LiveKit Server Not Running

**Problem**: LiveKit server is not accessible.

**Solution**:
```bash
# Check if LiveKit is running
curl http://localhost:7880

# If not running, start it:
./start_all.sh
# Or manually:
docker run -d -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  livekit/livekit-server --dev --bind 0.0.0.0
```

### 3. Incorrect URL Format

**Problem**: WebSocket URL format is incorrect.

**Solution**: Ensure `.env.local` has:
```
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
```

**Note**: 
- Use `ws://` (not `wss://`) for localhost
- Use `wss://` for production/HTTPS

### 4. Browser Security/CORS Issues

**Problem**: Browser blocks WebRTC connections due to security policies.

**Solution**:
- Try a different browser (Chrome, Firefox, Edge)
- Ensure you're accessing via `http://localhost:3000` (not `127.0.0.1`)
- Check browser console for CORS errors

### 5. Firewall/Network Issues

**Problem**: Firewall blocks WebRTC ports.

**Solution**:
- Ensure ports 7880-7882 are not blocked
- Check if UDP port 7882 is accessible
- Try disabling firewall temporarily to test

### 6. Token Generation Issues

**Problem**: Invalid or expired tokens.

**Solution**:
```bash
# Test token generation
curl -X POST http://localhost:3000/api/token \
  -H "Content-Type: application/json" \
  -d '{"roomName":"test-room","participantName":"test-user"}'

# Should return: {"identity":"...","accessToken":"..."}
```

### 7. LiveKit Server Configuration

**Problem**: Server not configured for localhost connections.

**Solution**: Ensure LiveKit is started with:
```bash
docker run -d -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  livekit/livekit-server --dev --bind 0.0.0.0 --node-ip 127.0.0.1
```

The `--dev` flag enables dev mode with default credentials.

### 7B. Agent Not Joining (Explicit Dispatch)

Viventium typically runs the LiveKit worker with `LIVEKIT_AGENT_NAME=viventium`, which requires **explicit dispatch**.

If the playground shows **Agent name: None** / **No agent connected**, set the agent name to `viventium` **before connecting** (or use `./start_playground.sh`, which sets defaults).

#### Important: “Token roomConfig.agents” may not dispatch in local dev

Even if the Playground UI sets an agent name, some local LiveKit server setups do not reliably honor
`roomConfig.agents` embedded in the join token.

**Fix (what we use now)**: the Playground backend explicitly calls:

- `AgentDispatchClient.createDispatch(roomName, agentName, ...)`

This guarantees the worker gets a job and joins the room.

### 8. Browser Console Debugging

**Steps**:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for WebRTC/ICE errors
4. Check Network tab for WebSocket connection
5. Look for errors like:
   - "ICE connection failed"
   - "Failed to set local description"
   - "Permission denied"

### 9. Verify Connection Step-by-Step

```bash
# 1. Check LiveKit server
curl http://localhost:7880
# Should return: OK

# 2. Check playground
curl http://localhost:3000
# Should return: HTML page

# 3. Check token API
curl -X POST http://localhost:3000/api/token \
  -H "Content-Type: application/json" \
  -d '{"roomName":"test"}'
# Should return: JSON with accessToken

# 4. Check Docker container
docker ps | grep livekit
# Should show running container

# 5. Check LiveKit logs
docker logs $(docker ps -q --filter ancestor=livekit/livekit-server | head -1) | tail -50
# Look for connection attempts and errors
```

### 10. Common Browser-Specific Issues

**Chrome/Edge**:
- Check `chrome://settings/content/microphone`
- Check `chrome://settings/content/camera`
- Try incognito mode (disables extensions)

**Firefox**:
- Check `about:preferences#privacy` → Permissions
- Check `about:config` → `media.navigator.permission.disabled` (should be false)

**Safari**:
- Safari has stricter WebRTC policies
- Try Chrome/Firefox instead for development

### 11. Reset Everything

If nothing works, try a complete reset:

```bash
# Stop all services
./start_all.sh --stop

# Stop playground (Ctrl+C in its terminal)

# Restart LiveKit
docker stop $(docker ps -q --filter ancestor=livekit/livekit-server)
docker rm $(docker ps -aq --filter ancestor=livekit/livekit-server)

# Restart everything
./start_all.sh
# In another terminal:
cd interfaces/livekit-playground
./start_playground.sh
```

### 12. Alternative: Use Manual Connection Mode

If "env" mode doesn't work, try manual mode:

1. Generate a token manually:
```bash
docker run --rm livekit/livekit-cli token create \
  --dev \
  --identity "playground-user" \
  --name "Playground" \
  --room "test-room" \
  --join \
  --valid-for "24h"
```

2. Copy the token
3. In playground UI, switch to "Manual" tab
4. Enter:
   - URL: `ws://localhost:7880`
   - Token: (paste the token from step 1)
5. Click Connect

## Still Having Issues?

1. Check browser console for detailed errors
2. Check LiveKit server logs: `docker logs <container_id>`
3. Check playground logs (terminal where you ran `./start_playground.sh`)
4. Try the LiveKit connection test: https://livekit.io/connection-test
5. Verify your setup matches the README.md configuration

