// Capture error payloads, not complete requests or CLI results. Error instances
// expose only diagnostic fields; SDK request/config objects contain credentials.
const diagnosticFields = ['name', 'message', 'code', 'type', 'param', 'status', 'statusCode', 'httpStatusCode',
  'requestId', 'requestID', 'request_id', 'errno', 'syscall', 'error', 'errors', 'details', 'info', 'data', 'body', 'cause'] as const;

export function errorDetails(value: unknown, seen = new Set<object>()): unknown {
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (value === null || typeof value !== 'object') return typeof value === 'bigint' ? String(value) : value;
  if (seen.has(value)) return '[circular]';
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map(item => errorDetails(item, seen));
    const entries = value instanceof Error
      ? diagnosticFields.map(key => [key, (value as unknown as Record<string, unknown>)[key]] as const)
      : Object.entries(value);
    const result = Object.fromEntries(entries.map(([key, item]) => [key, errorDetails(item, seen)])
      .filter(([, item]) => item !== undefined));
    const response = (value as { response?: { status?: unknown; statusText?: unknown; data?: unknown } }).response;
    if (value instanceof Error && response) result.response = errorDetails({ status: response.status, statusText: response.statusText, data: response.data }, seen);
    return result;
  } finally { seen.delete(value); }
}

export function errorMessage(value: unknown, fallback = 'Agent 调用失败'): string {
  const seen = new Set<object>();
  function message(item: unknown): string | undefined {
    if (typeof item === 'string') return item.trim() ? item : undefined;
    if (!item || typeof item !== 'object' || seen.has(item)) return undefined;
    seen.add(item);
    if (Array.isArray(item)) return item.map(message).filter(Boolean).join('\n') || undefined;
    const object = item as Record<string, unknown>;
    return message(object.message) || message(object.error) || message(object.errors)
      || message(object.data) || message((object.response as { data?: unknown } | undefined)?.data) || message(object.cause);
  }
  return message(value) || fallback;
}
