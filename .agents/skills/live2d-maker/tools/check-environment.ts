import { configurationReport } from '../shared/codex/config-report.ts';

try { console.log(JSON.stringify(configurationReport(), null, 2)); }
catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
