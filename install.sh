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
  echo "  security   — Developer + LSP MCP + security emphasis"
  echo "  full       — Everything, including experimental LSP MCP (Node 18+ required)"
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

# Run Node installer for profile-based setup
if command -v node &>/dev/null; then
  node "${REPO_ROOT}/scripts/install-apply.js" \
    --repo "$REPO_ROOT" \
    --profile "$PROFILE"
else
  warn "Node.js not found — skipping profile-based module selection."
  warn "All agents, skills, and commands are available via the plugin link."
fi

# ── Install contexts ───────────────────────────────────────────────────────────
CONTEXTS_DIR="${HOME}/.claude/contexts"
mkdir -p "$CONTEXTS_DIR"
for ctx in "${REPO_ROOT}/contexts/"*.md; do
  cp "$ctx" "$CONTEXTS_DIR/$(basename "$ctx")"
done
success "Contexts installed to: ${CONTEXTS_DIR}"

# ── Install shell aliases ──────────────────────────────────────────────────────
ALIAS_BLOCK="
# ohmyclaude — context-mode aliases
alias claude-dev='claude --system-prompt \"\$(cat ~/.claude/contexts/dev.md)\"'
alias claude-review='claude --system-prompt \"\$(cat ~/.claude/contexts/review.md)\"'
alias claude-plan='claude --system-prompt \"\$(cat ~/.claude/contexts/plan.md)\"'
alias claude-debug='claude --system-prompt \"\$(cat ~/.claude/contexts/debug.md)\"'
alias claude-research='claude --system-prompt \"\$(cat ~/.claude/contexts/research.md)\"'
# end ohmyclaude"

# Detect shell config file
if [[ -f "${HOME}/.zshrc" ]]; then
  SHELL_RC="${HOME}/.zshrc"
elif [[ -f "${HOME}/.bashrc" ]]; then
  SHELL_RC="${HOME}/.bashrc"
elif [[ -f "${HOME}/.bash_profile" ]]; then
  SHELL_RC="${HOME}/.bash_profile"
else
  SHELL_RC="${HOME}/.zshrc"
fi

# Remove old block if present, then append fresh
if grep -q "# ohmyclaude — context-mode aliases" "$SHELL_RC" 2>/dev/null; then
  # Remove existing block
  sed -i.bak '/# ohmyclaude — context-mode aliases/,/# end ohmyclaude/d' "$SHELL_RC"
fi
echo "$ALIAS_BLOCK" >> "$SHELL_RC"
success "Aliases added to: ${SHELL_RC}"

# ── Post-install ───────────────────────────────────────────────────────────────
echo ""
success "ohmyclaude installed successfully!"
echo ""
echo "  Profile:  ${PROFILE}"
echo "  Location: ${PLUGIN_DIR}"
echo ""
echo "  Reload your shell, then start Claude in any mode:"
echo ""
echo "    claude-dev       → implementation mode (@hephaestus + @momus)"
echo "    claude-review    → code & security review (@athena + @argus)"
echo "    claude-plan      → planning pipeline (@metis → @hermes → @nemesis)"
echo "    claude-debug     → root cause investigation (@heracles)"
echo "    claude-research  → exploration mode (@metis + @apollo)"
echo ""
echo "  Or use /ultrawork inside any session for the full pipeline."
echo ""
echo "  Reload now:"
echo "    source ${SHELL_RC}"
echo ""
