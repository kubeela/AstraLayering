export type ReportImage = { target: string; path: string; label: string };
export { reportReferences, type ReportReference } from '../.agents/skills/live2d-maker/shared/report-links.js';
export function reportSummary(text: string): string;
export function renderReport(text: string, images?: ReportImage[], urlFor?: (path: string) => string): string;
