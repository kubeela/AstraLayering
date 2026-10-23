export type ReportImage = { target: string; path: string; label: string };
export function reportReferences(text: string): Array<{ target: string; label: string; start: number; end: number }>;
export function reportSummary(text: string): string;
export function renderReport(text: string, images?: ReportImage[], urlFor?: (path: string) => string): string;
