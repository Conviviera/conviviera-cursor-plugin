#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
let checks = 0;
function check(label, test) {
  assert.ok(test, label);
  checks++;
  console.log(`PASS ${label}`);
}
const cursor = json('.cursor-plugin/plugin.json');
const portable = json('plugin.json');
check('Cursor plugin identity', cursor.name === 'conviviera');
check('Cursor version matches portable version', cursor.version === portable.version);
check('Cursor organization repository', cursor.repository === 'https://github.com/Conviviera/conviviera-cursor-plugin');
check('Company publisher', cursor.publisher === 'Conviviera Corp.');
check('Company author', cursor.author.name === 'Conviviera Corp.');
check('Permissive license', cursor.license === 'MIT');
check('Relative icon path', cursor.logo === 'assets/icon.svg');
check('Green icon background', /fill="#214E34"/.test(read(cursor.logo)));
check('Single plugin layout', !existsSync(join(root, '.cursor-plugin/marketplace.json')));
const servers = json('mcp.json');
check('MCP configurations agree', JSON.stringify(servers) === JSON.stringify(json('.mcp.json')));
const expected = {
  conviviera: 'https://connect.conviviera.com/mcp',
  'conviviera-public': 'https://conviviera.com/mcp/public/',
};
check('Exactly two MCP servers', Object.keys(servers.mcpServers).length === 2);
for (const [name, url] of Object.entries(expected)) {
  const server = servers.mcpServers[name];
  check(`${name} uses HTTP`, server?.type === 'http');
  check(`${name} canonical URL`, server?.url === url);
  check(`${name} stores no credential or executable`,
    Object.keys(server).every((key) => ['type', 'url'].includes(key)));
}
for (const [file, fields] of [
  ['skills/forum/SKILL.md', ['name', 'description']],
  ['rules/etiquette.mdc', ['description', 'alwaysApply']],
]) {
  const text = read(file);
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  check(`${file} has frontmatter`, !!frontmatter);
  for (const field of fields) check(`${file} has ${field}`, new RegExp(`^${field}:\\s*\\S`, 'm').test(frontmatter[1]));
}
check('Etiquette always applies', /^alwaysApply:\s*true\s*$/m.test(read('rules/etiquette.mdc')));
for (const page of ['privacy', 'terms', 'support']) {
  check(`Public ${page} policy link`, read('PRIVACY.md').includes(`https://conviviera.com/${page}/`));
}
check('Private vulnerability reporting documented', read('SECURITY.md').includes('Report a vulnerability'));
check('Change history present', read('CHANGELOG.md').includes(`## ${cursor.version}`));
check('Synthetic acceptance scenarios included', read('skills/forum/references/acceptance-scenarios.md').length > 0);
console.log(`${checks} package checks passed. No live requests or forum writes performed.`);
