#!/usr/bin/env node
// Runs one Python file in the section's Krita and prints the bridge's JSON
// result: node submit.mjs <script.py> --bridge <dir> [--timeout <seconds>]
// The bridge directory defaults to $ASTRA_KRITA_BRIDGE. Exit code 0 when the
// job succeeded, 1 when it failed, 2 for usage or bridge errors.
import { BridgeError, submitJob } from './client.mjs';

const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(name); return index < 0 ? undefined : args.splice(index, 2)[1]; };
const bridge = option('--bridge') ?? process.env.ASTRA_KRITA_BRIDGE;
const timeout = Number(option('--timeout') ?? 600);
const script = args[0];
if (!script || !bridge || !(timeout > 0)) {
  process.stderr.write('用法：node submit.mjs <script.py> --bridge <桥接目录> [--timeout <秒>]\n');
  process.exit(2);
}
try {
  const result = await submitJob(bridge, script, { timeoutSeconds: timeout });
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exit(result.ok ? 0 : 1);
} catch (error) {
  if (!(error instanceof BridgeError)) throw error;
  process.stderr.write(error.message + '\n');
  process.exit(2);
}
