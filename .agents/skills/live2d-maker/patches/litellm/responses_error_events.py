"""Normalize incomplete Responses error envelopes without changing successful events."""
import json


def error_detail(event):
    if event.get('type') == 'response.failed':
        response = event.get('response')
        error = response.get('error') if isinstance(response, dict) else None
    elif event.get('type') == 'error':
        error = event.get('error')
        if error is None:
            error = {k: event[k] for k in ('message', 'code', 'param') if k in event}
    else:
        return None
    if isinstance(error, str) and error:
        return {'message': error}
    if isinstance(error, dict) and any(error.get(k) is not None for k in ('message', 'code', 'type')):
        return dict(error)
    return None


class ErrorSequence:
    """Hold at most one empty failed envelope for the following error event."""
    def __init__(self):
        self.pending = None

    def feed(self, chunk):
        try:
            event = json.loads(chunk)
        except (ValueError, TypeError):
            return self.finish() if chunk == '[DONE]' and self.pending else chunk
        if not isinstance(event, dict):
            return chunk
        if self.pending is not None:
            pending, self.pending = self.pending, None
            detail = error_detail(event)
            if detail is not None:
                pending['response'] = {**(pending.get('response') or {}), 'status': 'failed', 'error': detail}
                if 'sequence_number' in event:
                    pending['sequence_number'] = event['sequence_number']
            # A later success cannot turn an already failed response into a success.
            return json.dumps(pending)
        if event.get('type') == 'response.failed' and isinstance(event.get('response'), dict) and error_detail(event) is None:
            self.pending = event
            return None
        if event.get('type') == 'error' and event.get('error') is None:
            detail = error_detail(event)
            if detail is not None:
                return json.dumps({**event, 'error': detail})
        return chunk

    def finish(self):
        pending, self.pending = self.pending, None
        return json.dumps(pending) if pending is not None else None


def forward_error_frame(frame, detail):
    """Keep the error's original fields after LiteLLM maps it to an exception."""
    if not frame or not detail:
        return frame
    lines = frame.splitlines()
    for index, line in enumerate(lines):
        if not line.startswith('data:'):
            continue
        event = json.loads(line[5:])
        if event.get('type') != 'response.failed':
            continue
        error = {**(event['response'].get('error') or {}), **detail}
        # Responses clients require a string code; some compatible APIs use HTTP integers.
        if isinstance(error.get('code'), int) and not isinstance(error['code'], bool):
            error['code'] = str(error['code'])
        event['response']['error'] = error
        lines[index] = 'data: ' + json.dumps(event)
        return '\n'.join(lines) + '\n\n'
    return frame
