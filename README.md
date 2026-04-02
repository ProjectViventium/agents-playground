# LiveKit Agents Playground

The LiveKit Agents Playground is a web-based frontend interface for interacting with LiveKit agents. This interface connects to the LiveKit server running via `start_all.sh` and provides a visual interface to test and interact with your Viventium agent.

## Features

- **Audio & Chat**: Speak/type to the agent and receive responses
- **Agent Configuration**: Configure room settings, participant info, and agent dispatch
- **Real-time Interaction**: Full WebRTC support for low-latency communication

### Viventium Defaults (Important)

Viventium’s current agent experience is **audio + chat** (no camera/video processing). This interface is configured to:

- Disable **camera** and **screen share** by default
- Hide **agent video** UI by default
- Default to **explicit dispatch** agent name: `viventium`

## Prerequisites

- Node.js (v18 or higher)
- pnpm package manager
- LiveKit server running (via `start_all.sh`)

## Quick Start

1. **Install dependencies** (first time only):
```bash
   cd interfaces/livekit-playground
pnpm install
```

2. **Configure environment** (if not already done):
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local if needed (defaults work with start_all.sh dev mode)
   ```

3. **Start the playground**:
   ```bash
   ./start_playground.sh
   ```

4. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Configuration

The playground uses environment variables from `.env.local`:

- `LIVEKIT_API_KEY`: LiveKit API key (default: `devkey` for dev mode)
- `LIVEKIT_API_SECRET`: LiveKit API secret (default: `secret` for dev mode)
- `NEXT_PUBLIC_LIVEKIT_URL`: LiveKit WebSocket URL (default: `ws://localhost:7880`)
- `NEXT_PUBLIC_LIVEKIT_AGENT_NAME`: Agent name for explicit dispatch (default: `viventium`)
- `NEXT_PUBLIC_LIVEKIT_ROOM`: Optional default room name (default: `viventium-playground`)
- `NEXT_PUBLIC_VIVENTIUM_DISABLE_VIDEO`: If enabled (`1/true`), forces camera/screen/video UI off (default: enabled)

These defaults match the dev mode configuration in `start_all.sh`, so no changes are needed if you're using the default setup.

### LiveKit Server (Docker Desktop/macOS)

If you ever see **Runtime ConnectionError**: `"could not establish pc connection"`, your LiveKit server is likely advertising an unreachable **container IP** (e.g. `172.17.x.x`) in ICE candidates.

Fix: run LiveKit with a host-reachable node IP:

- `livekit-server --dev --bind 0.0.0.0 --node-ip 127.0.0.1`

`start_all.sh` now does this automatically via `LIVEKIT_NODE_IP` + `--node-ip`.

## Usage

### Connecting to Your Agent

1. **Ensure services are running**:
   ```bash
   # From workspace root
   ./start_all.sh
   ```

2. **Start the playground**:
   ```bash
   cd interfaces/livekit-playground
   ./start_playground.sh
   ```

3. **In the playground UI**:
   - The playground will automatically use the `NEXT_PUBLIC_LIVEKIT_URL` from your `.env.local`
   - Click "Connect" to join a room
   - Your agent (if running) will automatically connect to the same room
   - Use the settings panel to configure:
     - Room name (or leave empty for auto-generated)
     - Participant name/ID
     - Agent name (if using explicit dispatch)
     - Custom metadata and attributes

### Agent Dispatch

The playground supports two dispatch modes:

1. **Auto-dispatch** (default): Leave `agent_name` empty in settings. The agent will automatically join any room.

2. **Explicit dispatch**: Set `agent_name` to match your agent's `LIVEKIT_AGENT_NAME` (default: `viventium`). The agent will only join rooms where it's explicitly dispatched.

**Viventium note**: Viventium typically runs in **explicit dispatch** mode (worker registered with `LIVEKIT_AGENT_NAME=viventium`), so the playground should use `agent_name=viventium`. The `start_playground.sh` script and UI defaults set this for you.

### Testing Your Agent

- **Audio**: Enable microphone to send audio to your agent
- **Video**: Enable camera to send video to your agent  
- **Chat**: Type messages in the chat panel to send text to your agent
- **Settings**: Configure room and participant settings before connecting

## Integration with start_all.sh

The playground is designed to work seamlessly with the services started by `start_all.sh`:

- **LiveKit Server**: Running on port 7880 (Docker container)
- **Agent**: Running and registered with LiveKit
- **Credentials**: Uses the same dev mode credentials (`devkey`/`secret`)

## Troubleshooting

### Port Already in Use
If port 3000 is already in use:
```bash
# Find and stop the process
lsof -ti:3000 | xargs kill -9
```

### Cannot Connect to LiveKit Server
- Verify LiveKit is running: `curl http://localhost:7880`
- Check Docker: `docker ps | grep livekit`
- Verify credentials match in `.env.local`

### Agent Not Connecting
- Verify agent is running: Check `start_all.sh` output
- Check agent logs: `.viventium/logs/agent.log`
- Verify `LIVEKIT_AGENT_NAME` matches if using explicit dispatch
- Check LiveKit server logs: `docker logs <container_id>`

## Development

### Project Structure

- `src/pages/`: Next.js pages and API routes
- `src/components/`: React components for the playground UI
- `src/hooks/`: React hooks for connection and configuration
- `src/pages/api/token.ts`: Token generation endpoint (uses LiveKit SDK)

### Building for Production

```bash
pnpm run build
pnpm run start
```

## References

- [LiveKit Agents Documentation](https://docs.livekit.io/agents)
- [LiveKit Agents Framework](https://github.com/livekit/agents)
- [Original Playground Repository](https://github.com/livekit/agents-playground)
