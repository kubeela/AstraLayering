"""Optional callback for LiteLLM gateways used by external Codex providers."""
import json
import logging
import os

from litellm.integrations.custom_logger import CustomLogger
from litellm.responses.streaming_iterator import BaseResponsesAPIStreamingIterator
from litellm.proxy.common_utils.responses_stream_errors import ResponsesStreamErrorState
from litellm._logging import redact_internal_details_from_client_message

from responses_error_events import ErrorSequence, forward_error_frame


def _plain(value):
    if isinstance(value, dict):
        return value
    if hasattr(value, 'model_dump'):
        return value.model_dump(mode='json')
    return vars(value) if value is not None and hasattr(value, '__dict__') else None


def _safe_detail(detail):
    detail = dict(detail)
    if isinstance(detail.get('message'), str):
        detail['message'] = redact_internal_details_from_client_message(detail['message'])
    encoded = json.dumps(detail, default=str)
    for name, value in os.environ.items():
        if value and name.endswith(('_API_KEY', '_MASTER_KEY')):
            encoded = encoded.replace(value, '[redacted]')
    return json.loads(encoded)


def install():
    cls, formatter = BaseResponsesAPIStreamingIterator, ResponsesStreamErrorState
    required = ('_process_chunk', '_raise_if_ended_without_terminal_event', '_map_error_event_exception')
    if any(not callable(getattr(cls, name, None)) for name in required) or not callable(getattr(formatter, 'format_failure', None)):
        raise RuntimeError('This LiteLLM version does not expose the Responses error compatibility hooks.')
    original_process = cls._process_chunk
    if getattr(original_process, '_astra_error_passthrough', False):
        return
    original_end, original_map, original_format = cls._raise_if_ended_without_terminal_event, cls._map_error_event_exception, formatter.format_failure

    def process(iterator, chunk):
        sequence = getattr(iterator, '_astra_error_sequence', None)
        if sequence is None:
            sequence = iterator._astra_error_sequence = ErrorSequence()
        normalized = sequence.feed(chunk)
        return original_process(iterator, normalized) if normalized is not None else None

    def end(iterator):
        sequence = getattr(iterator, '_astra_error_sequence', None)
        pending = sequence.finish() if sequence else None
        if pending is not None:
            result = original_process(iterator, pending)
            if result is not None:
                iterator._maybe_raise_for_error_event(result)
        return original_end(iterator)

    def map_error(iterator, error):
        exception = original_map(iterator, error)
        detail = _plain(error)
        if detail:
            detail = _safe_detail(detail)
            exception._astra_responses_error = detail
            logging.getLogger('litellm.responses_errors').warning('Upstream Responses error: %s', json.dumps(detail))
        return exception

    def format_failure(state, exception):
        frame = original_format(state, exception)
        seen = set()
        while isinstance(exception, Exception) and id(exception) not in seen:
            seen.add(id(exception))
            detail = getattr(exception, '_astra_responses_error', None)
            if detail:
                return forward_error_frame(frame, detail)
            exception = getattr(exception, 'original_exception', None)
        return frame

    process._astra_error_passthrough = True
    cls._process_chunk, cls._raise_if_ended_without_terminal_event, cls._map_error_event_exception = process, end, map_error
    formatter.format_failure = format_failure


class ResponsesErrorCompatibility(CustomLogger):
    def __init__(self):
        super().__init__()
        install()


proxy_handler = ResponsesErrorCompatibility()
