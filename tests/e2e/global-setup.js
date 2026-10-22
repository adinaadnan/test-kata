import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export default function globalSetup() {
  if (process.env.DESK_URL) return;
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  execFileSync('docker', ['compose', '-p', 'desk-e2e', '-f', 'compose.e2e.yaml', 'up', '--build', '--wait'], {
    cwd: root,
    stdio: 'inherit',
  });
}
