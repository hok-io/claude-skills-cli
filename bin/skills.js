#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const { installCommand } = require('../src/commands/install');
const { addCommand } = require('../src/commands/add');
const { upgradeCommand, upgradeAllCommand } = require('../src/commands/upgrade');
const { removeCommand } = require('../src/commands/remove');
const { listCommand } = require('../src/commands/list');
const { doctorCommand } = require('../src/commands/doctor');
const { searchCommand } = require('../src/commands/search');
const { tagsCommand } = require('../src/commands/tags');
const { outdatedCommand } = require('../src/commands/outdated');
const { availableCommand } = require('../src/commands/available');
const { version } = require('../package.json');

const program = new Command();
const projectRoot = process.cwd();

function handleError(err) {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
}

program
  .name('skills')
  .description('Manage Claude Skills for your project')
  .version(version, '-V, --show-version', 'output the version number');

// ---------- Core commands ----------

program
  .command('install')
  .description('Sync .claude/skills/ from .claude/skills.json')
  .action(() => installCommand(projectRoot).catch(handleError))
  .addHelpText('after', `
Example:
  $ skills install                                    # everyone runs this after a fresh clone or pull
`);

program
  .command('list')
  .description('List all skills in the manifest')
  .action(() => listCommand(projectRoot).catch(handleError))
  .addHelpText('after', `
Example:
  $ skills list
`);

program
  .command('doctor')
  .description('Diagnose configuration and environment issues')
  .action(() => doctorCommand(projectRoot).catch(handleError))
  .addHelpText('after', `
Example:
  $ skills doctor                                     # checks node, git, manifest, gitignore, every skill
`);

// ---------- skill scope (mutates skills.json) ----------

const skill = program
  .command('skill')
  .description('Manage individual skills (project maintainer)');

skill
  .command('add <source>')
  .description('Add a new skill to the manifest')
  .requiredOption('--skill <name>', 'Skill name')
  .requiredOption('--version <tag>', 'Git tag (e.g. v1.2.0)')
  .action((source, options) => addCommand(source, options, projectRoot).catch(handleError))
  .addHelpText('after', `
Examples:
  $ skills skill add https://github.com/myorg/skills --skill prd --version v1.0.0
  $ skills skill add https://gitlab.com/team/skills --skill review --version v2.0.0
`);

skill
  .command('upgrade [name@version]')
  .description('Upgrade a skill (e.g. prd@v1.3.0), or use --all')
  .option('--all', 'Upgrade every skill to its latest tag')
  .action((nameAtVersion, options) => {
    if (options.all) {
      upgradeAllCommand(projectRoot).catch(handleError);
    } else if (nameAtVersion) {
      upgradeCommand(nameAtVersion, projectRoot).catch(handleError);
    } else {
      console.error('Error: Provide a skill name (e.g. prd@v1.3.0) or use --all');
      process.exit(1);
    }
  })
  .addHelpText('after', `
Examples:
  $ skills skill upgrade prd@v1.3.0                   # upgrade one skill to a specific tag
  $ skills skill upgrade --all                        # upgrade every skill to its latest tag
`);

skill
  .command('remove <name>')
  .description('Remove a skill from the manifest')
  .action((name) => removeCommand(name, projectRoot).catch(handleError))
  .addHelpText('after', `
Example:
  $ skills skill remove prd
`);

// ---------- remote scope (read-only queries) ----------

const remote = program
  .command('remote')
  .description('Query remote repos (read-only, no manifest changes)');

remote
  .command('search <source>')
  .description('List available skills in a remote repository')
  .action((source) => searchCommand(source, projectRoot).catch(handleError))
  .addHelpText('after', `
Example:
  $ skills remote search https://github.com/myorg/skills
`);

remote
  .command('tags <source>')
  .description('Show the latest 5 tags of a remote repository')
  .action((source) => tagsCommand(source, projectRoot).catch(handleError))
  .addHelpText('after', `
Example:
  $ skills remote tags https://github.com/myorg/skills
`);

remote
  .command('available')
  .description('List skills available in your manifest sources that are not installed')
  .action(() => availableCommand(projectRoot).catch(handleError))
  .addHelpText('after', `
Example:
  $ skills remote available                           # uses sources from your skills.json
`);

remote
  .command('outdated')
  .description('Check installed skills for newer tags on their remote')
  .action(() => outdatedCommand(projectRoot).catch(handleError))
  .addHelpText('after', `
Example:
  $ skills remote outdated                            # current vs latest for every installed skill
`);

// ---------- Top-level help workflows ----------

program.addHelpText('after', `
Common workflows:

  Discover and add a new skill from a remote repo:
    $ skills remote search <source>                   # what skills are in this repo?
    $ skills remote tags <source>                     # what versions are available?
    $ skills skill add <source> --skill <name> --version <tag>

  Sync your local copy after pulling new commits (everyone on the team):
    $ skills install

  Check for updates and upgrade:
    $ skills remote outdated                          # what's behind latest?
    $ skills skill upgrade <name>@<version>           # upgrade one
    $ skills skill upgrade --all                      # upgrade everything

  See what else is offered by the repos you already use:
    $ skills remote available

Requirements:
  - Node.js >= 18
  - git on PATH (uses your existing git auth — no tokens to manage)
`);

program.parse(process.argv);
