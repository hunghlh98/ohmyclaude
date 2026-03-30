#!/usr/bin/env node
/**
 * ohmyclaude LSP MCP Server
 *
 * Exposes 6 language-server operations as MCP tools:
 *   - lsp_goto_definition
 *   - lsp_find_references
 *   - lsp_symbols
 *   - lsp_diagnostics
 *   - lsp_prepare_rename
 *   - lsp_rename
 *
 * Architecture inspired by oh-my-openagent's LSP tool suite.
 * Uses a singleton LSPServerManager with per-workspace connection pools.
 *
 * Status: STUB — v0.2 implementation target.
 * See ROADMAP.md for implementation plan.
 *
 * Supported language servers (auto-detected by file extension):
 *   - TypeScript/JavaScript: typescript-language-server
 *   - Python: pyright or pylsp
 *   - Go: gopls
 *   - Rust: rust-analyzer
 *
 * Install language servers:
 *   npm install -g typescript-language-server typescript
 *   pip install pyright
 *   go install golang.org/x/tools/gopls@latest
 *   rustup component add rust-analyzer
 */

'use strict';

// MCP SDK stdio transport
// import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// TODO (v0.2): implement LSP connection pool and tool handlers
// Reference implementation: oh-my-openagent/src/tools/lsp/

const TOOLS = [
  {
    name: 'lsp_goto_definition',
    description: 'Jump to the definition of a symbol at a given position in a file.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Absolute path to the file' },
        line: { type: 'number', description: 'Line number (0-indexed)' },
        character: { type: 'number', description: 'Character offset (0-indexed)' },
      },
      required: ['file', 'line', 'character'],
    },
  },
  {
    name: 'lsp_find_references',
    description: 'Find all references to a symbol across the workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Absolute path to the file' },
        line: { type: 'number', description: 'Line number (0-indexed)' },
        character: { type: 'number', description: 'Character offset (0-indexed)' },
        includeDeclaration: { type: 'boolean', default: true },
      },
      required: ['file', 'line', 'character'],
    },
  },
  {
    name: 'lsp_symbols',
    description: 'Get symbols in a file (document) or search across the workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Absolute path to the file (for document symbols)' },
        query: { type: 'string', description: 'Symbol name query (for workspace symbol search)' },
        scope: { type: 'string', enum: ['document', 'workspace'], default: 'document' },
      },
    },
  },
  {
    name: 'lsp_diagnostics',
    description: 'Get errors, warnings, and hints from the language server for a file or directory.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to file or directory' },
        severity: {
          type: 'array',
          items: { type: 'string', enum: ['error', 'warning', 'information', 'hint'] },
          default: ['error', 'warning'],
          description: 'Filter by severity',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'lsp_prepare_rename',
    description: 'Check if renaming a symbol at the given position is valid. Call before lsp_rename.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Absolute path to the file' },
        line: { type: 'number', description: 'Line number (0-indexed)' },
        character: { type: 'number', description: 'Character offset (0-indexed)' },
      },
      required: ['file', 'line', 'character'],
    },
  },
  {
    name: 'lsp_rename',
    description: 'Rename a symbol across the entire workspace. Call lsp_prepare_rename first.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Absolute path to the file' },
        line: { type: 'number', description: 'Line number (0-indexed)' },
        character: { type: 'number', description: 'Character offset (0-indexed)' },
        newName: { type: 'string', description: 'The new name for the symbol' },
      },
      required: ['file', 'line', 'character', 'newName'],
    },
  },
];

// Stub: respond to MCP initialize and tools/list for now
process.stdout.write(JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  result: {
    protocolVersion: '2024-11-05',
    capabilities: { tools: {} },
    serverInfo: { name: 'ohmyclaude-lsp', version: '0.1.0-stub' },
  },
}) + '\n');

process.stderr.write(
  '[ohmyclaude-lsp] LSP MCP server is a stub (v0.2 target). ' +
  'Install @modelcontextprotocol/sdk and implement tool handlers to enable LSP features.\n'
);
