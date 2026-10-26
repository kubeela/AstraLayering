export type ReportReference = { target: string; label: string; start: number; end: number };
export function reportReferences(text: string): ReportReference[];
