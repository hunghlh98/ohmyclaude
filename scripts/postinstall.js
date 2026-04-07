#!/usr/bin/env node
/**
 * postinstall.js
 *
 * Runs automatically after:
 *   - claude plugin install hunghlh98/ohmyclaude
 *   - npm install (manual)
 *
 * v1.0.0: Zero-setup. No contexts to copy, no aliases to inject.
 * Just prints quick-start instructions.
 */

'use strict';

const green  = s => `\x1b[32m${s}\x1b[0m`;
const blue   = s => `\x1b[34m${s}\x1b[0m`;

console.log('');
console.log(green('  ohmyclaude v1.0.0 ready!'));
console.log('');
console.log('  Single entry point:');
console.log(`    ${blue('/forge <what you want>')}   describe your task in natural language`);
console.log(`    ${blue('/forge sprint')}            run a sprint from the backlog`);
console.log(`    ${blue('/forge release')}           cut a release`);
console.log(`    ${blue('/forge commit')}            generate semantic commit message`);
console.log(`    ${blue('/forge help')}              show help`);
console.log('');
console.log('  10 agents available via @name:');
console.log('    @paige-product  @artie-arch     @una-ux        @sam-sec');
console.log('    @beck-backend   @effie-frontend @quinn-qa      @stan-standards');
console.log('    @devon-ops      @heracles');
console.log('');
console.log('  Optional: Install code-review-graph for enhanced analysis');
console.log('    claude plugin install code-review-graph');
console.log('');
