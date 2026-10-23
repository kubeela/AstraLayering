import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { knownBuild, patchResponseHeaders } from '../../patches/agv/patch-response-header.ts';

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const instruction = Buffer.from('48ba005847f80d00000048899000010000', 'hex');

test('verified AGV patch changes only the default duration and never mutates its input', () => {
  const source = Buffer.concat([Buffer.from('unchanged prefix'), instruction, Buffer.from('unchanged suffix')]);
  const offset = Buffer.byteLength('unchanged prefix');
  const expected = Buffer.from(source); expected.fill(0, offset + 2, offset + 10);
  const original = Buffer.from(source);
  const profile = { ...knownBuild, sourceSha256: hash(source), patchedSha256: hash(expected), offset };
  const patched = patchResponseHeaders(source, profile);
  assert.deepEqual(source, original);
  assert.deepEqual(patched, expected);
  assert.deepEqual(patched.subarray(0, offset + 2), source.subarray(0, offset + 2));
  assert.deepEqual(patched.subarray(offset + 10), source.subarray(offset + 10));
});

test('unknown builds, mismatched instructions and incorrect output fingerprints are refused', () => {
  const source = Buffer.from(instruction);
  assert.throws(() => patchResponseHeaders(source), /未知 AGV 构建/);
  const profile = { ...knownBuild, sourceSha256: hash(source), offset: 1 };
  assert.throws(() => patchResponseHeaders(source, profile), /指令不匹配/);
  assert.throws(() => patchResponseHeaders(source, { ...profile, offset: 0 }), /产物校验失败/);
  assert.deepEqual(source, instruction);
});
