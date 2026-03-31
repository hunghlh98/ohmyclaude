#!/usr/bin/env bash
# ohmyclaude installer
# Usage:
#   bash install.sh                    # developer profile (default)
#   bash install.sh --profile minimal  # minimal profile
#   bash install.sh --profile full     # full profile (includes LSP MCP)
#   bash install.sh --profile security # security-focused profile
#   bash install.sh --list-profiles    # show available profiles

set -euo pipefail

# ── Resolve repo root (handles symlinks) ───────────────────────────────────────
SCRIPT_PATH="${BASH_SOURCE[0]}"
while [ -L "$SCRIPT_PATH" ]; do
  SCRIPT_DIR="$(cd -P "$(dirname "$SCRIPT_PATH")" && pwd)"
  SCRIPT_PATH="$(readlink "$SCRIPT_PATH")"
  [[ "$SCRIPT_PATH" != /* ]] && SCRIPT_PATH="$SCRIPT_DIR/$SCRIPT_PATH"
done
REPO_ROOT="$(cd -P "$(dirname "$SCRIPT_PATH")" && pwd)"

# ── Colors ─────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[ohmyclaude]${NC} $1"; }
success() { echo -e "${GREEN}[ohmyclaude]${NC} $1"; }
warn()    { echo -e "${YELLOW}[ohmyclaude]${NC} $1"; }
error()   { echo -e "${RED}[ohmyclaude]${NC} $1" >&2; }

# ── Parse args ─────────────────────────────────────────────────────────────────
PROFILE="developer"
LIST_PROFILES=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile) PROFILE="$2"; shift 2 ;;
    --list-profiles) LIST_PROFILES=true; shift ;;
    *) error "Unknown argument: $1"; exit 1 ;;
  esac
done

if $LIST_PROFILES; then
  echo ""
  echo "Available profiles:"
  echo "  minimal    — Core orchestration + implementation agents only"
  echo "  developer  — Full agent team + all skills (default)"
  echo "  polyglot   — Developer + multi-language reviewers (Java, Go, Python, Rust, Kotlin, C++, Flutter, DB)"
  echo "  security   — Developer + LSP MCP + security emphasis"
  echo "  full       — Everything, including polyglot agents and experimental LSP MCP (Node 18+ required)"
  echo ""
  exit 0
fi

# ── Preflight checks ───────────────────────────────────────────────────────────
info "Starting ohmyclaude installation (profile: ${PROFILE})"
echo ""

# Check Claude Code
if ! command -v claude &>/dev/null; then
  warn "Claude Code CLI not found. Install it first:"
  warn "  https://claude.ai/code"
  warn "Continuing anyway — files will be placed in ~/.claude/plugins/ohmyclaude/"
fi

# Check Node for LSP
if [[ "$PROFILE" == "full" || "$PROFILE" == "security" ]]; then
  if ! command -v node &>/dev/null; then
    error "Node.js 18+ is required for the '$PROFILE' profile (LSP MCP server)."
    error "Install Node.js from https://nodejs.org or use --profile developer instead."
    exit 1
  fi
  NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
  if (( NODE_VERSION < 18 )); then
    error "Node.js 18+ required, found v${NODE_VERSION}. Use --profile developer instead."
    exit 1
  fi
fi

# ── Install ────────────────────────────────────────────────────────────────────
PLUGIN_DIR="${HOME}/.claude/plugins/ohmyclaude"

info "Installing to: ${PLUGIN_DIR}"

# Create plugin dir and symlink or copy
mkdir -p "$(dirname "$PLUGIN_DIR")"

if [ -L "$PLUGIN_DIR" ]; then
  rm "$PLUGIN_DIR"
fi

# Dev mode: symlink; production: would copy
if [[ "$REPO_ROOT" == "$HOME/.claude/plugins/ohmyclaude" ]]; then
  success "Already in plugin directory — no copy needed."
else
  ln -sfn "$REPO_ROOT" "$PLUGIN_DIR"
  success "Linked ${REPO_ROOT} → ${PLUGIN_DIR}"
fi

# ── Run postinstall (contexts + aliases + profile setup) ───────────────────────
if command -v node &>/dev/null; then
  node "${REPO_ROOT}/scripts/install-apply.js" \
    --repo "$REPO_ROOT" \
    --profile "$PROFILE"
  node "${REPO_ROOT}/scripts/postinstall.js"
else
  warn "Node.js not found — skipping context/alias setup."
  warn "Install Node.js 18+ and re-run to enable context-mode aliases."
fi
