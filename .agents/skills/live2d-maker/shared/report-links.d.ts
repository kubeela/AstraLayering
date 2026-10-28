export type ReportReference = { target: string; label: string; start: number; end: number; targetStart: number; targetEnd: number };
export function reportReferences(text: string): ReportReference[];
