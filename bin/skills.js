#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const { installCommand } = require('../src/commands/install');
const { addCommand } = require('../src/commands/add');
const { upgradeCommand } = require('../src/commands/upgrade');
const { removeCommand } = require('../src/commands/remove');
const { listCommand } = require('../src/commands/list');
const { doctorCommand } = require('../src/commands/doctor');

const program = new Command();
const projectRoot = process.cwd();

function handleError(err) {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
}

program
  .name('skills')
  .description('Manage Claude Skills for your project')
  .version('1.0.0', '-V, --show-version', 'output the version number');

program
  .command('install')
  .description('Sync .claude/skills/ from .claude/skills.json')
  .action(() => installCommand(projectRoot).catch(handleError));

program
  .command('add <source>')
  .description('Add a new skill')
  .requiredOption('--skill <name>', 'Skill name')
  .requiredOption('--version <tag>', 'Git tag (e.g. v1.2.0)')
  .action((source, options) => addCommand(source, options, projectRoot).catch(handleError));

program
  .command('upgrade <name@version>')
  .description('Upgrade a skill to a new version (e.g. prd@v1.3.0)')
  .action((nameAtVersion) => upgradeCommand(nameAtVersion, projectRoot).catch(handleError));

program
  .command('remove <name>')
  .description('Remove a skill')
  .action((name) => removeCommand(name, projectRoot).catch(handleError));

program
  .command('list')
  .description('List all skills in the manifest')
  .action(() => listCommand(projectRoot).catch(handleError));

program
  .command('doctor')
  .description('Diagnose configuration and environment issues')
  .action(() => doctorCommand(projectRoot).catch(handleError));

program.parse(process.argv);
