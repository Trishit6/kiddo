import { spawn } from 'node:child_process';
import process from 'node:process';

const targets = [
  ['--filter', '@reel/api', 'dev'],
  ['--filter', '@reel/web', 'dev'],
  ['--filter', '@reel/api', 'dev:worker'],
];

const children = targets.map((args) =>
  spawn('pnpm', args, { stdio: 'inherit', shell: process.platform === 'win32' }),
);

let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exitCode = code;
}

for (const child of children) {
  child.on('exit', (code) => stop(code ?? 0));
  child.on('error', () => stop(1));
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
