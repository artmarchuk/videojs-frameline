// Runs before every deploy script (the `predeploy:*` hooks in package.json) and refuses a deploy that is not exactly
// `origin/main`. Several sessions work on this project at once, each on its own branch in its own folder. A deploy
// builds the files of the folder it runs in, so a deploy from a feature folder takes the other sessions' work off
// the live site. Production therefore comes only from a clean checkout of `origin/main`. See "Branches and deploys"
// in CLAUDE.md. There is no override: for a preview of a branch use `npm run preview:vercel`.
import { spawnSync } from 'node:child_process';

const git = (...args) => {
  const { status, stdout, stderr } = spawnSync('git', args, { encoding: 'utf8' });
  return { ok: status === 0, out: (stdout ?? '').trim(), err: (stderr ?? '').trim() };
};

const problems = [];

const fetched = git('fetch', '--quiet', 'origin', 'main');
if (!fetched.ok) problems.push(`Could not fetch origin/main, so it cannot be compared: ${fetched.err || 'git fetch failed'}`);

const head = git('rev-parse', 'HEAD');
const main = git('rev-parse', 'origin/main');
const branch = git('rev-parse', '--abbrev-ref', 'HEAD').out;
if (!head.ok || !main.ok) {
  problems.push('This folder is not a git checkout with an origin/main.');
} else if (head.out !== main.out) {
  const ahead = git('rev-list', '--count', 'origin/main..HEAD').out;
  const behind = git('rev-list', '--count', 'HEAD..origin/main').out;
  problems.push(
    `This folder is on ${branch === 'HEAD' ? 'a detached commit' : `"${branch}"`} at ${head.out.slice(0, 7)}, not at origin/main (${main.out.slice(0, 7)}): ${ahead} commit(s) not on main, ${behind} commit(s) of main missing here.`
  );
}

// Changed tracked files anywhere, and new files where the build reads them.
const changed = git('status', '--porcelain', '--untracked-files=no').out;
if (changed) problems.push(`Uncommitted changes:\n${changed}`);
const added = git('status', '--porcelain', '--untracked-files=all', '--', 'src', 'apps').out
  .split('\n')
  .filter((line) => line.startsWith('??'))
  .join('\n');
if (added) problems.push(`Untracked files that the build would include:\n${added}`);

if (problems.length) {
  console.error('\nDeploy refused: production is deployed only from a clean checkout of origin/main.\n');
  for (const problem of problems) console.error(`- ${problem}\n`);
  console.error('Merge your branch into main first (merge origin/main into the branch, run the checks, push), then deploy');
  console.error('from a folder that is on origin/main with nothing uncommitted. For a preview of this folder as it is:');
  console.error('npm run preview:vercel\n');
  process.exit(1);
}

console.log(`Deploy guard: this folder is origin/main (${main.out.slice(0, 7)}) with nothing uncommitted.`);
