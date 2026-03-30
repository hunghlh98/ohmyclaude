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

# ── Install contexts ───────────────────────────────────────────────────────────
$ContextsDir = Join-Path $HOME ".claude\contexts"
New-Item -ItemType Directory -Path $ContextsDir -Force | Out-Null
Get-ChildItem "$RepoRoot\contexts\*.md" | Copy-Item -Destination $ContextsDir
Write-Success "Contexts installed to: $ContextsDir"

# ── Install PowerShell profile aliases ─────────────────────────────────────────
$AliasBlock = @"

# ohmyclaude — context-mode aliases
function claude-dev      { claude --system-prompt (Get-Content "$ContextsDir\dev.md" -Raw) @args }
function claude-review   { claude --system-prompt (Get-Content "$ContextsDir\review.md" -Raw) @args }
function claude-plan     { claude --system-prompt (Get-Content "$ContextsDir\plan.md" -Raw) @args }
function claude-debug    { claude --system-prompt (Get-Content "$ContextsDir\debug.md" -Raw) @args }
function claude-research { claude --system-prompt (Get-Content "$ContextsDir\research.md" -Raw) @args }
# end ohmyclaude
"@

$ProfilePath = $PROFILE
if (-not (Test-Path $ProfilePath)) {
  New-Item -ItemType File -Path $ProfilePath -Force | Out-Null
}

$ProfileContent = Get-Content $ProfilePath -Raw -ErrorAction SilentlyContinue
if ($ProfileContent -match "# ohmyclaude — context-mode aliases") {
  $ProfileContent = $ProfileContent -replace "(?s)# ohmyclaude — context-mode aliases.*?# end ohmyclaude\r?\n?", ""
  Set-Content $ProfilePath $ProfileContent
}
Add-Content $ProfilePath $AliasBlock
Write-Success "Aliases added to: $ProfilePath"

# ── Post-install ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Success "ohmyclaude installed successfully!"
Write-Host ""
Write-Host "  Profile:  $Profile"
Write-Host "  Location: $PluginDir"
Write-Host ""
Write-Host "  Reload your shell, then start Claude in any mode:"
Write-Host ""
Write-Host "    claude-dev       -> implementation mode (@hephaestus + @momus)"
Write-Host "    claude-review    -> code & security review (@athena + @argus)"
Write-Host "    claude-plan      -> planning pipeline (@metis -> @hermes -> @nemesis)"
Write-Host "    claude-debug     -> root cause investigation (@heracles)"
Write-Host "    claude-research  -> exploration mode (@metis + @apollo)"
Write-Host ""
Write-Host "  Or use /ultrawork inside any session for the full pipeline."
Write-Host ""
Write-Host "  Reload now:  . `$PROFILE"
Write-Host ""
