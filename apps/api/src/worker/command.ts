import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

export interface CommandOptions {
  timeoutMs?: number;
  onStdoutLine?: (line: string) => void;
  maxStderrChars?: number;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export class CommandError extends Error {
  readonly command: string;
  readonly stderr: string;

  constructor(command: string, message: string, stderr: string) {
    super(message);
    this.name = 'CommandError';
    this.command = command;
    this.stderr = stderr;
  }
}

/**
 * Spawns a binary with an argument array (never a shell string) and enforces a
 * timeout. stderr is captured for logs; stdout is also collected for ffprobe.
 */
export function runCommand(
  binary: string,
  args: string[],
  options: CommandOptions = {},
): Promise<CommandResult> {
  const timeoutMs = options.timeoutMs ?? 5 * 60 * 1000;
  const maxStderr = options.maxStderrChars ?? 16_000;

  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    const stdoutLines = options.onStdoutLine ? createInterface({ input: child.stdout }) : null;
    stdoutLines?.on('line', (line) => options.onStdoutLine?.(line));

    child.stdout.on('data', (chunk: Buffer) => {
      if (!stdoutLines) stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < maxStderr) stderr += chunk.toString().slice(0, maxStderr - stderr.length);
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      stdoutLines?.close();
      reject(new CommandError(binary, `${binary} could not be started: ${error.message}`, stderr));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      stdoutLines?.close();
      if (timedOut) {
        reject(new CommandError(binary, `${binary} timed out after ${timeoutMs}ms`, stderr));
        return;
      }
      if (code !== 0) {
        reject(new CommandError(binary, `${binary} exited with code ${code ?? 'unknown'}`, stderr));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}
