#!/bin/bash
set -e

# ============================================================================
# LiveKit Playground Startup Script
# ============================================================================
# 
# This script starts the LiveKit Agents Playground frontend interface.
# It connects to the LiveKit server running via start_all.sh
#
# Usage:
#   ./start_playground.sh          Start the playground
#   ./start_playground.sh --help   Show help message
#
# ============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLAYGROUND_DIR="$SCRIPT_DIR"

# Port
PLAYGROUND_PORT=3000

print_header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1" >&2
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_step() {
    echo -e "${CYAN}▶${NC} $1"
}

check_dependency() {
    if ! command -v "$1" >/dev/null 2>&1; then
        print_error "Missing required command: $1"
        print_info "Install it with: npm install -g $1"
        exit 1
    fi
}

check_port() {
    local port=$1
    if lsof -Pi :"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $port is already in use"
        return 1
    fi
    return 0
}

load_env_file() {
    local env_file="$1"
    if [ ! -f "$env_file" ]; then
        return 1
    fi
    
    # Load .env file, handling multi-line values
    local current_key=""
    local current_value=""
    local in_multiline_quote=false
    
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip comments and empty lines (unless we're in a multi-line value)
        if [ "$in_multiline_quote" = false ]; then
            if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
                continue
            fi
        fi
        
        # Remove inline comments (everything after #) - but only if not in quoted value
        if [ "$in_multiline_quote" = false ]; then
            line="${line%%#*}"
        fi
        
        # Trim whitespace (use sed instead of xargs to avoid quote parsing issues)
        line=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        
        # Handle multi-line quoted values
        if [ "$in_multiline_quote" = true ]; then
            # Check if this line ends the multi-line value (ends with closing quote)
            if [[ "$line" =~ \"[[:space:]]*$ ]]; then
                # Remove closing quote and append
                current_value="${current_value}
${line%\"}"
                # Export the complete value
                if [[ "$current_key" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
                    export "$current_key=$current_value"
                fi
                current_key=""
                current_value=""
                in_multiline_quote=false
            else
                # Continue accumulating the multi-line value
                current_value="${current_value}
${line}"
            fi
            continue
        fi
        
        # Skip if empty after comment removal
        if [[ -z "$line" ]]; then
            continue
        fi
        
        # Split on first = sign
        if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
            key="${BASH_REMATCH[1]}"
            value="${BASH_REMATCH[2]}"
            # Trim whitespace from key and value (use sed instead of xargs)
            key=$(echo "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
            value=$(echo "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
            
            # Check if value starts with quote but doesn't end with quote (multi-line)
            if [[ "$value" =~ ^\"[^\"]*$ ]]; then
                # Multi-line quoted value - start accumulating
                current_key="$key"
                current_value="${value#\"}"  # Remove opening quote
                in_multiline_quote=true
            else
                # Single-line value - handle normally
                # Remove surrounding quotes if present
                if [[ "$value" =~ ^\"(.*)\"$ ]]; then
                    value="${BASH_REMATCH[1]}"
                fi
                # Export valid keys
                if [[ "$key" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
                    export "$key=$value"
                fi
            fi
        fi
    done < "$env_file"
    return 0
}

main() {
    clear
    
    print_header "LiveKit Agents Playground"
    
    # Load environment variables
    print_step "Loading environment variables..."
    if [ -f "$PLAYGROUND_DIR/.env.local" ]; then
        load_env_file "$PLAYGROUND_DIR/.env.local"
        print_success "Loaded .env.local"
    elif [ -f "$WORKSPACE_ROOT/.env" ]; then
        load_env_file "$WORKSPACE_ROOT/.env"
        print_success "Loaded workspace .env"
        # Override with playground-specific values if needed
        export NEXT_PUBLIC_LIVEKIT_URL="${NEXT_PUBLIC_LIVEKIT_URL:-${LIVEKIT_URL:-ws://127.0.0.1:7880}}"
    else
        print_warning "No .env.local or .env file found"
        print_info "Using defaults: ws://127.0.0.1:7880 with devkey/secret"
        export LIVEKIT_API_KEY="${LIVEKIT_API_KEY:-devkey}"
        export LIVEKIT_API_SECRET="${LIVEKIT_API_SECRET:-secret}"
        export NEXT_PUBLIC_LIVEKIT_URL="${NEXT_PUBLIC_LIVEKIT_URL:-ws://127.0.0.1:7880}"
    fi

    # Default to the same agent name used by start_all.sh (explicit dispatch mode).
    # This ensures the playground token request includes agentName and LiveKit will dispatch the Viventium agent.
    export NEXT_PUBLIC_LIVEKIT_AGENT_NAME="${NEXT_PUBLIC_LIVEKIT_AGENT_NAME:-${LIVEKIT_AGENT_NAME:-viventium}}"
    # Optional: set a default room name via env var.
    # We default to a stable room for easier debugging.
    export NEXT_PUBLIC_LIVEKIT_ROOM="${NEXT_PUBLIC_LIVEKIT_ROOM:-viventium-playground}"
    # Viventium currently doesn't consume/publish video in the agent; keep playground video off by default.
    export NEXT_PUBLIC_VIVENTIUM_DISABLE_VIDEO="${NEXT_PUBLIC_VIVENTIUM_DISABLE_VIDEO:-1}"
    
    # Verify required environment variables
    if [ -z "${LIVEKIT_API_KEY:-}" ] || [ -z "${LIVEKIT_API_SECRET:-}" ]; then
        print_error "LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set"
        print_info "Create .env.local file with these variables"
        exit 1
    fi
    
    if [ -z "${NEXT_PUBLIC_LIVEKIT_URL:-}" ]; then
        print_error "NEXT_PUBLIC_LIVEKIT_URL must be set"
        print_info "Set it in .env.local or .env file"
        exit 1
    fi
    
    echo ""
    echo -e "${BOLD}Configuration:${NC}"
    echo -e "  LiveKit URL:     ${GREEN}${NEXT_PUBLIC_LIVEKIT_URL}${NC}"
    echo -e "  API Key:          ${GREEN}${LIVEKIT_API_KEY:0:8}...${NC}"
    echo -e "  Agent Name:       ${GREEN}${NEXT_PUBLIC_LIVEKIT_AGENT_NAME}${NC}"
    echo -e "  Playground Port:  ${GREEN}${PLAYGROUND_PORT}${NC}"
    echo ""
    
    # Pre-flight checks
    print_step "Running pre-flight checks..."
    check_dependency pnpm
    check_dependency node
    
    # Check if LiveKit server is running
    print_step "Checking LiveKit server connection..."
    if curl -s "http://localhost:7880" >/dev/null 2>&1; then
        print_success "LiveKit server is running"
    else
        print_warning "LiveKit server may not be running on port 7880"
        print_info "Make sure start_all.sh has started the LiveKit server"
    fi
    
    print_success "Pre-flight checks passed"
    echo ""
    
    # Check if dependencies are installed
    if [ ! -d "$PLAYGROUND_DIR/node_modules" ]; then
        print_step "Installing dependencies (this may take a moment)..."
        cd "$PLAYGROUND_DIR"
        pnpm install || {
            print_error "Failed to install dependencies"
            exit 1
        }
        print_success "Dependencies installed"
        echo ""
    fi
    
    # Check if port is available
    if ! check_port "$PLAYGROUND_PORT"; then
        print_warning "Port $PLAYGROUND_PORT is already in use"
        print_info "Another instance may be running, or you can stop it and try again"
    fi
    
    # Start the playground
    print_header "Starting Playground"
    print_step "Starting Next.js development server..."
    print_info "The playground will be available at: http://localhost:${PLAYGROUND_PORT}"
    print_info "Press Ctrl+C to stop"
    echo ""
    
    cd "$PLAYGROUND_DIR"
    
    # Export environment variables for Next.js
    export LIVEKIT_API_KEY
    export LIVEKIT_API_SECRET
    export NEXT_PUBLIC_LIVEKIT_URL
    export NEXT_PUBLIC_LIVEKIT_AGENT_NAME
    export NEXT_PUBLIC_LIVEKIT_ROOM
    export NEXT_PUBLIC_VIVENTIUM_DISABLE_VIDEO
    
    # Start the dev server
    pnpm run dev
}

# Parse arguments
for arg in "$@"; do
    case $arg in
        --help|-h|help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --help, -h       Show this help message"
            echo ""
            echo "Description:"
            echo "  Starts the LiveKit Agents Playground frontend interface."
            echo "  Connects to the LiveKit server running via start_all.sh"
            echo ""
            echo "Environment:"
            echo "  The script loads environment variables from:"
            echo "    1. .env.local (in playground directory)"
            echo "    2. .env (in workspace root)"
            echo ""
            echo "  Required variables:"
            echo "    LIVEKIT_API_KEY          LiveKit API key"
            echo "    LIVEKIT_API_SECRET       LiveKit API secret"
            echo "    NEXT_PUBLIC_LIVEKIT_URL  LiveKit WebSocket URL (e.g., ws://localhost:7880)"
            echo ""
            echo "Example:"
            echo "  $0"
            exit 0
            ;;
        *)
            print_warning "Unknown argument: $arg"
            print_info "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main
main "$@"

