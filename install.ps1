# ohmyclaude installer (Windows)
# Usage:
#   .\install.ps1                        # developer profile (default)
#   .\install.ps1 -Profile minimal       # minimal profile
#   .\install.ps1 -Profile full          # full profile
#   .\install.ps1 -ListProfiles          # show profiles

param(
  [string]$Profile = "developer",
  [switch]$ListProfiles
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Resolve repo root (handles symlinks) ───────────────────────────────────────
$ScriptPath = $MyInvocation.MyCommand.Path
while ($true) {
  $item = Get-Item $ScriptPath -ErrorAction SilentlyContinue
  if ($null -eq $item -or $item.LinkType -ne "SymbolicLink") { break }
  $target = $item.Target
  if ($target -isnot [array]) { $target = @($target) }
  $ScriptPath = $target[0]
}
$RepoRoot = Split-Path -Parent $ScriptPath

function Write-Info    { param($msg) Write-Host "[ohmyclaude] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[ohmyclaude] $msg" -ForegroundColor Green }
function Write-Warn    { param($msg) Write-Host "[ohmyclaude] $msg" -ForegroundColor Yellow }
function Write-Err     { param($msg) Write-Host "[ohmyclaude] $msg" -ForegroundColor Red }

if ($ListProfiles) {
  Write-Host ""
  Write-Host "Available profiles:"
  Write-Host "  minimal    - Core orchestration + implementation agents only"
  Write-Host "  developer  - Full agent team + all skills (default)"
  Write-Host "  security   - Developer + LSP MCP + security emphasis"
  Write-Host "  full       - Everything, including experimental LSP MCP (Node 18+ required)"
  Write-Host ""
  exit 0
}

# ── Preflight ──────────────────────────────────────────────────────────────────
Write-Info "Starting ohmyclaude installation (profile: $Profile)"

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Warn "Claude Code CLI not found. Install from https://claude.ai/code"
}

if ($Profile -in @("full", "security")) {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Err "Node.js 18+ required for '$Profile' profile. Use -Profile developer instead."
    exit 1
  }
  $nodeVersion = [int](node --version).TrimStart('v').Split('.')[0]
  if ($nodeVersion -lt 18) {
    Write-Err "Node.js 18+ required, found v$nodeVersion. Use -Profile developer instead."
    exit 1
  }
}

# ── Install ────────────────────────────────────────────────────────────────────
$PluginDir = Join-Path $HOME ".claude\plugins\ohmyclaude"
Write-Info "Installing to: $PluginDir"

$PluginsDir = Split-Path -Parent $PluginDir
if (-not (Test-Path $PluginsDir)) {
  New-Item -ItemType Directory -Path $PluginsDir -Force | Out-Null
}

if (Test-Path $PluginDir) {
  Remove-Item $PluginDir -Recurse -Force
}

New-Item -ItemType SymbolicLink -Path $PluginDir -Target $RepoRoot | Out-Null
Write-Success "Linked $RepoRoot -> $PluginDir"

if (Get-Command node -ErrorAction SilentlyContinue) {
  node "$RepoRoot\scripts\install-apply.js" --repo "$RepoRoot" --profile $Profile
} else {
  Write-Warn "Node.js not found — skipping profile-based setup."
}

# ── Post-install ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Success "ohmyclaude installed successfully!"
Write-Host ""
Write-Host "  Profile:  $Profile"
Write-Host "  Location: $PluginDir"
Write-Host ""
Write-Host "  Quick start:"
Write-Host "    /ultrawork <your task>         full pipeline"
Write-Host "    /plan <task>                   planning only"
Write-Host "    @hermes plan this for me       invoke orchestrator"
Write-Host ""
Write-Host "  Verify with:  claude plugin list"
Write-Host ""
