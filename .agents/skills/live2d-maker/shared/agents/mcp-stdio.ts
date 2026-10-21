import { createInterface } from 'node:readline';
// One process per CLI request; all callbacks remain in the owning workflow process.
const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
const controllers = new Set<AbortController>();
async function receive(line: string) {
  const message = JSON.parse(line);
  const controller = new AbortController(); controllers.add(controller);
  try {
    const result = await fetch(process.env.LAYERING_MCP_URL!, { method: 'POST', signal: controller.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.LAYERING_MCP_TOKEN}` },
      body: JSON.stringify(message) });
    if (message.id !== undefined) process.stdout.write(await result.text() + '\n');
  } finally { controllers.delete(controller); }
}
for await (const line of input) if (line.trim()) void receive(line).catch(error => process.stderr.write(String(error) + '\n'));
for (const controller of controllers) controller.abort();
