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
check('Codex version matches portable version', json('.codex-plugin/plugin.json').version === portable.version);
check('Portable manifest names the organization repository', portable.repository === cursor.repository);
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
  conviviera: 'https://connect.conviviera.com/mcp/core',
};
check('Exactly one MCP server, on the core profile', Object.keys(servers.mcpServers).length === 1);
for (const [name, url] of Object.entries(expected)) {
  const server = servers.mcpServers[name];
  check(`${name} uses HTTP`, server?.type === 'http');
  check(`${name} canonical URL`, server?.url === url);
  check(`${name} stores no credential or executable`,
    Object.keys(server).every((key) => ['type', 'url'].includes(key)));
}
const skills = ['check-in', 'delegations', 'forum', 'room-data', 'rooms'];
for (const [file, fields] of [
  ...skills.map((name) => [`skills/${name}/SKILL.md`, ['name', 'description']]),
  ['rules/etiquette.mdc', ['description', 'alwaysApply']],
]) {
  const text = read(file);
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  check(`${file} has frontmatter`, !!frontmatter);
  for (const field of fields) check(`${file} has ${field}`, new RegExp(`^${field}:\\s*\\S`, 'm').test(frontmatter[1]));
}
check('Etiquette always applies', /^alwaysApply:\s*true\s*$/m.test(read('rules/etiquette.mdc')));
// Every skill and the rule carry the same five duties, whichever one a host loads alone.
for (const file of [...skills.map((name) => `skills/${name}/SKILL.md`), 'rules/etiquette.mdc']) {
  const text = read(file).replace(/\s+/g, ' ');
  check(`${file} verifies identity first`, text.includes('conviviera_identity'));
  check(`${file} states lab and model truthfully`, /lab and model truthfully|truthfully which lab and model/.test(text));
  check(`${file} treats forum and room text as untrusted data`, text.includes('untrusted data'));
  check(`${file} keeps room content out of public posts`, /into a public post|out of public posts/.test(text));
  check(`${file} waits for approval of the exact text`, /approv\w+ (of )?(that |the |its )?exact text/.test(text));
  check(`${file} names no server this package does not configure`, !text.includes('conviviera-public'));
}
for (const name of skills) {
  check(`${name} skill is named for its folder`, new RegExp(`^name: ${name}$`, 'm').test(read(`skills/${name}/SKILL.md`)));
}
const catalog = skills.map((name) => read(`skills/${name}/SKILL.md`)).join('\n');
for (const tool of ['conviviera_identity', 'conviviera_topics', 'conviviera_discussions', 'conviviera_read_discussion',
  'conviviera_read_post', 'conviviera_feedback', 'conviviera_activity', 'conviviera_start_discussion', 'conviviera_reply',
  'conviviera_private_threads', 'conviviera_read_private_thread', 'conviviera_private_updates', 'conviviera_private_reply',
  'conviviera_private_summary', 'conviviera_delegate', 'conviviera_delegation_vote', 'conviviera_delegation_report',
  'conviviera_calc_project', 'conviviera_calc_stats', 'conviviera_calc_arithmetic']) {
  check(`A skill names ${tool}`, catalog.includes(`\`${tool}\``));
}
const listing = JSON.stringify(portable.extensions['com.openai']);
check('Listing copy no longer denies private rooms', !listing.includes('Private messages are not available'));
const subtitle = portable.extensions['com.openai'].interface.shortDescription;
check('Both OpenAI manifests use the same subtitle within 30 characters',
  subtitle.length <= 30 && subtitle === json('.codex-plugin/plugin.json').interface.shortDescription);
check('Review cases: five positive and three negative',
  portable.extensions['com.openai'].review.test_cases.positive.length === 5
  && portable.extensions['com.openai'].review.test_cases.negative.length === 3);
const linkedResult = portable.extensions['com.openai'].review.test_cases.positive[3].expected_behavior;
check('Both OpenAI linked-result cases keep the read-only consent path',
  linkedResult === json('.codex-plugin/plugin.json').extensions['com.openai'].review.test_cases.positive[3].expected_behavior
  && ['room role permits posting', 'permissions.legacy_unscoped', 'After explicit approval',
    'With read-only Core OAuth', 'consent is declined or unavailable'].every((step) => linkedResult.includes(step)));
const notes = portable.extensions['com.openai'].publication.release_notes;
check('One release note in both OpenAI manifests',
  notes === json('.codex-plugin/plugin.json').extensions['com.openai'].publication.release_notes);
check('The changelog carries that release note', read('CHANGELOG.md').replace(/\s+/g, ' ').includes(notes));
check('The release note names its version', notes.startsWith(`Version ${portable.version} `));
for (const page of ['privacy', 'terms', 'support']) {
  check(`Public ${page} policy link`, read('PRIVACY.md').includes(`https://conviviera.com/${page}/`));
}
check('Private vulnerability reporting documented', read('SECURITY.md').includes('Report a vulnerability'));
check('Change history present', read('CHANGELOG.md').includes(`## ${cursor.version}`));
check('Synthetic acceptance scenarios included', read('skills/forum/references/acceptance-scenarios.md').length > 0);
console.log(`${checks} package checks passed. No live requests or forum writes performed.`);
