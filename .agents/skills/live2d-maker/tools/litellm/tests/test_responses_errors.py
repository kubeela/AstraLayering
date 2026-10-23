import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from responses_error_events import ErrorSequence, forward_error_frame


def failed(error=None):
    return {'type': 'response.failed', 'sequence_number': 2, 'response': {'id': 'resp-fixture', 'status': 'failed', 'error': error, 'output': []}}


class ResponsesErrors(unittest.TestCase):
    def test_empty_failure_followed_by_actual_error_preserves_all_fields(self):
        errors = [
            {'type': 'invalid_request_error', 'code': 'content_policy_violation', 'message': 'Image processing blocked due to content policy violation.', 'param': 'input'},
            {'type': 'invalid_request_error', 'code': 'invalid_image', 'message': 'Exceeded maximum number of images (50)', 'param': 'input'},
            {'type': 'server_error', 'code': 'server_error', 'message': 'Upstream service unavailable'},
        ]
        for error in errors:
            with self.subTest(code=error['code']):
                seq = ErrorSequence()
                self.assertIsNone(seq.feed(json.dumps(failed())))
                event = json.loads(seq.feed(json.dumps({'type': 'error', 'sequence_number': 3, 'error': error})))
                self.assertEqual(event['response']['error'], error)
                self.assertEqual(event['response']['id'], 'resp-fixture')
                self.assertEqual(event['sequence_number'], 3)
                self.assertIsNone(seq.finish())

    def test_complete_failure_and_success_are_unchanged(self):
        for event in [failed({'code': 'rate_limit_exceeded', 'message': 'Try again later'}), {'type': 'response.completed', 'response': {'status': 'completed'}}, {'type': 'response.output_text.delta', 'delta': 'result'}]:
            chunk = json.dumps(event)
            self.assertEqual(ErrorSequence().feed(chunk), chunk)

    def test_failure_at_eof_or_done_remains_a_failure(self):
        for ending in ['eof', 'done']:
            seq = ErrorSequence();seq.feed(json.dumps(failed()))
            result = seq.finish() if ending == 'eof' else seq.feed('[DONE]')
            self.assertEqual(json.loads(result), failed())
            self.assertIsNone(seq.finish())

    def test_later_success_cannot_hide_an_empty_failure(self):
        seq = ErrorSequence();seq.feed(json.dumps(failed()))
        self.assertEqual(json.loads(seq.feed(json.dumps({'type': 'response.completed'}))), failed())

    def test_malformed_failure_is_left_to_original_parser(self):
        for response in [None, [], 'invalid']:
            chunk = json.dumps({'type': 'response.failed', 'response': response})
            self.assertEqual(ErrorSequence().feed(chunk), chunk)

    def test_independent_streams_do_not_share_errors(self):
        a, b = ErrorSequence(), ErrorSequence()
        a.feed(json.dumps(failed()))
        self.assertEqual(b.feed('{"type":"response.completed"}'), '{"type":"response.completed"}')
        self.assertEqual(json.loads(a.finish()), failed())

    def test_flat_errors_and_string_errors(self):
        seq = ErrorSequence()
        flat = {'type': 'error', 'code': 'invalid_image', 'message': 'Invalid image', 'param': 'input'}
        self.assertEqual(json.loads(seq.feed(json.dumps(flat)))['error'], {'code': 'invalid_image', 'message': 'Invalid image', 'param': 'input'})
        seq.feed(json.dumps(failed()))
        self.assertEqual(json.loads(seq.feed('{"type":"error","error":"Provider failed"}'))['response']['error']['message'], 'Provider failed')

    def test_proxy_exception_formatting_keeps_original_code_type_and_param(self):
        detail = {'code': 'invalid_image', 'type': 'invalid_request_error', 'message': 'Bad input image', 'param': 'input'}
        frame = 'event: response.failed\ndata: ' + json.dumps(failed({'code': 'server_error', 'message': 'Generic'})) + '\n\n'
        rewritten = forward_error_frame(frame, detail)
        event = json.loads(next(line[5:] for line in rewritten.splitlines() if line.startswith('data:')))
        self.assertEqual(event['response']['error'], detail)
        self.assertIsNone(forward_error_frame(None, detail))


if __name__ == '__main__':
    unittest.main()
