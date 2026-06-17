import { spawn } from 'node:child_process';
import { platform } from 'node:os';

export async function openInBrowser(url: string): Promise<void> {
  const os = platform();
  if (os === 'win32') {
    await runDetached('cmd', ['/c', 'start', '', url]);
    return;
  }
  if (os === 'darwin') {
    await runDetached('open', [url]);
    return;
  }
  await runDetached('xdg-open', [url]);
}

export async function copyToClipboard(text: string): Promise<void> {
  const os = platform();
  if (os === 'win32') {
    await pipeToProcess('clip', text);
    return;
  }
  if (os === 'darwin') {
    await pipeToProcess('pbcopy', text);
    return;
  }
  try {
    await pipeToProcess('xclip', text, ['-selection', 'clipboard']);
  } catch {
    await pipeToProcess('xsel', text, ['--clipboard', '--input']);
  }
}

function runDetached(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { detached: true, stdio: 'ignore', shell: false });
    child.on('error', reject);
    child.unref();
    resolve();
  });
}

function pipeToProcess(command: string, text: string, args: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
    });
    child.stdin.write(text);
    child.stdin.end();
  });
}