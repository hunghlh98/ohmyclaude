#!/usr/bin/env node
/**
 * _toggle.js — per-hook env-var opt-out helper (v2.5.1+).
 *
 * Disable any hook individually by setting OHMYCLAUDE_HOOK_<NAME>=off,
 * where <NAME> is the script filename (without .js) upper-cased with
 * dashes converted to underscores. Examples:
 *   OHMYCLAUDE_HOOK_PRE_WRITE_CHECK=off   # disables pre-write-check.js
 *   OHMYCLAUDE_HOOK_USAGE_TRACKER=off     # disables usage-tracker.js
 *   OHMYCLAUDE_HOOK_COST_PROFILER=off     # disables cost-profiler.js
 *
 * This is finer-grained than install-module-level toggles (which affect
 * every hook in a module) and finer than install profiles. Use it to
 * silence a single noisy hook without touching manifests.
 *
 * NOT a hook itself — underscore-prefixed files in hooks/scripts/ are
 * support infrastructure and excluded from hook counts + test iteration.
 */

'use strict';

const path = require('path');

function envVarName(scriptFilename) {
  const base = path.basename(scriptFilename, '.js');
  return 'OHMYCLAUDE_HOOK_' + base.toUpperCase().replace(/-/g, '_');
}

function isHookDisabled(scriptFilename) {
  return (process.env[envVarName(scriptFilename)] || '').toLowerCase() === 'off';
}

module.exports = { envVarName, isHookDisabled };
