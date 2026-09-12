import fs from 'node:fs/promises';
import path from 'node:path';

const owner = 'liujianping0329';
const repo = 'next-market';
const ref = 'main';
const sourcePrefix = 'public/study/';
const outputRoot = path.resolve('public/study');
const headers = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
const treeRes = await fetch(treeUrl, { headers });
if (!treeRes.ok) throw new Error(`GitHub tree request failed: ${treeRes.status} ${await treeRes.text()}`);
const tree = await treeRes.json();
const files = tree.tree.filter(x => x.type === 'blob' && x.path.startsWith(sourcePrefix));

await fs.rm(outputRoot, { recursive: true, force: true });
await fs.mkdir(outputRoot, { recursive: true });
for (const file of files) {
  const relative = file.path.slice(sourcePrefix.length);
  const target = path.join(outputRoot, relative);
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${file.path.split('/').map(encodeURIComponent).join('/')}`;
  const res = await fetch(rawUrl);
  if (!res.ok) throw new Error(`Download failed: ${file.path} (${res.status})`);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, Buffer.from(await res.arrayBuffer()));
  console.log(`synced ${relative}`);
}
console.log(`Synced ${files.length} files to public/study`);