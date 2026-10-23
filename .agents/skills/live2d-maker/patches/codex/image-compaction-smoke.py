#!/usr/bin/env python3
"""Verify visual compaction against a local strict (<50 images) Responses API.

Uses distinct real PNGs, checks every image payload and completed tool pair, and
resumes failed compactions. No external API, credentials, or existing task data.
"""
import argparse
import base64
import json
import os
from pathlib import Path
import subprocess
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from smoke import fixture_png


def images(value):
    if isinstance(value, list):
        return [image for item in value for image in images(item)]
    if not isinstance(value, dict):
        return []
    if value.get('type') == 'input_image':
        return [value['image_url']]
    return [image for item in value.values() for image in images(item)]


def check_pairs(items):
    ids = [item['id'] for item in items if item.get('id')]
    assert len(ids) == len(set(ids)), 'duplicate response item IDs after compaction'
    calls = {item['call_id']: item for item in items if item['type'] in ('function_call', 'custom_tool_call')}
    for item in items:
        if item['type'] in ('function_call_output', 'custom_tool_call_output') and item.get('call_id'):
            assert item['call_id'] in calls, ('orphaned tool output', item['call_id'])


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        compact = json.loads(body.get('client_metadata', {}).get('x-codex-turn-metadata', '{}')).get('request_kind') == 'compaction'
        incoming = body.get('input', [])
        self.server.requests.append((compact, incoming))
        check_pairs(incoming)
        assert 'image content omitted because you do not support image input' not in json.dumps(incoming)
        assert 'FAILED_SUMMARY_MUST_NOT_SURVIVE' not in json.dumps(incoming)
        if len(images(incoming)) >= 50:
            self.send_response(400); self.end_headers()
            self.wfile.write(b'{"error":{"message":"Exceeded maximum number of images (50)","type":"invalid_request_error"}}')
            return
        index = len(self.server.requests)
        failed = compact and self.server.fail and (self.server.case != 'failed_later' or index > 1)
        if failed:
            self.server.failed_indices.add(index - 1)
        rid = f'resp_{index}'
        text = 'Visual checks completed; preserve their findings and inspect the retained images next.' if compact else 'DONE'
        if failed:
            text = 'FAILED_SUMMARY_MUST_NOT_SURVIVE'
        items = [{'type': 'message', 'role': 'assistant', 'id': f'msg_{index}', 'content': [{'type': 'output_text', 'text': text}]}]
        if self.server.case == 'tool_batch' and index == 1:
            items = [{'type': 'function_call', 'name': 'view_image', 'call_id': f'view-{i}',
                      'arguments': json.dumps({'path': str(path)})} for i, path in enumerate(self.server.pictures)]
        if self.server.case == 'code_batch' and index == 1:
            code = 'text("source: original crop [1,2,3,4]; all operations completed");\n'
            code += '\n'.join('image(' + json.dumps(url) + ');' for url in self.server.urls[44:])
            self.server.code = code
            items = [{'type': 'custom_tool_call', 'call_id': 'code-batch', 'name': 'exec', 'input': code}]
        if self.server.case == 'empty_summary' and failed:
            items = []
        events = [{'type': 'response.created', 'response': {'id': rid}}]
        events += [{'type': 'response.output_item.done', 'item': item} for item in items]
        if failed and self.server.case != 'empty_summary':
            events.append({'type': 'response.failed', 'response': {'id': rid, 'status': 'failed',
                           'error': {'code': 'server_error', 'message': 'intentional local fixture interruption'}}})
        else:
            events.append({'type': 'response.completed', 'response': {'id': rid, 'usage': {'input_tokens': 100, 'output_tokens': 20, 'total_tokens': 120}}})
        data = ''.join('data: ' + json.dumps(event) + '\n\n' for event in events).encode()
        self.send_response(200); self.send_header('Content-Type', 'text/event-stream')
        self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--codex', type=Path, required=True)
    parser.add_argument('--case', choices=['48', '49', '50', '52', '120', 'tool_batch', 'code_batch', 'failed_summary', 'failed_later', 'empty_summary', 'disabled'])
    args = parser.parse_args()
    cases = [args.case] if args.case else ['48', '49', '50', '52', '120', 'tool_batch', 'code_batch', 'failed_summary', 'failed_later', 'empty_summary', 'disabled']
    binary = args.codex.resolve()
    with tempfile.TemporaryDirectory(prefix='layering-visual-compaction-') as directory:
        root = Path(directory)
        pictures = []
        urls = []
        for i in range(120):
            data = fixture_png(bytes([i, 128, 160])); path = root / f'image-{i}.png'
            path.write_bytes(data); pictures.append(path)
            urls.append('data:image/png;base64,' + base64.b64encode(data).decode())
        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            for case in cases:
                total = int(case) if case.isdigit() else 120 if case == 'failed_later' else 52 if case in ('tool_batch', 'code_batch') else 49
                server.case = case; server.fail = case in ('failed_summary', 'failed_later', 'empty_summary')
                server.failed_indices = set()
                server.requests = []; server.pictures = pictures[:total]; server.urls = urls[:total]
                home = root / case; home.mkdir()
                env = {k: v for k, v in os.environ.items() if not k.startswith(('LAYERING_', 'ASTRA_TEMP_'))}
                env.update(CODEX_HOME=str(home), LAYERING_IMAGE_COMPACT_THRESHOLD='' if case == 'disabled' else '49')
                config = {'model': 'gpt-6-astra', 'model_provider': 'fixture', 'model_auto_compact_token_limit': 256000,
                          'features.code_mode': case == 'code_batch', 'features.code_mode_only': case == 'code_batch',
                          'features.image_generation': False,
                          'model_providers.fixture.name': 'Local fixture', 'model_providers.fixture.base_url': f'http://127.0.0.1:{server.server_port}/v1',
                          'model_providers.fixture.wire_api': 'responses', 'model_providers.fixture.requires_openai_auth': False,
                          'model_providers.fixture.stream_max_retries': 0, 'model_providers.fixture.request_max_retries': 0}
                command = [str(binary), '--no-daemon']
                for key, value in config.items():
                    command += ['-c', key + '=' + json.dumps(value)]
                start = command + ['exec', '--json', '--skip-git-repo-check']
                count = 0 if case == 'tool_batch' else 44 if case == 'code_batch' else total
                if count:
                    start += ['--image', ','.join(map(str, pictures[:count]))]
                start += ['--', 'Inspect the supplied images for this local fixture and finish.']
                result = subprocess.run(start, cwd=root, env=env, capture_output=True, text=True, timeout=120)
                events = [json.loads(line) for line in result.stdout.splitlines() if line.startswith('{')]
                thread_id = next(e['thread_id'] for e in events if e.get('type') == 'thread.started')
                if server.fail:
                    assert result.returncode != 0, ('failed compaction incorrectly succeeded', case)
                    # The failure must leave all original images, not a partial summary.
                    server.fail = False
                    result = subprocess.run(command + ['exec', 'resume', '--json', '--skip-git-repo-check', thread_id, 'Continue the fixture.'],
                                            cwd=root, env=env, capture_output=True, text=True, timeout=120)
                    assert any(json.loads(line).get('thread_id') == thread_id for line in result.stdout.splitlines() if line.startswith('{'))
                assert result.returncode == 0, (case, result.stderr[-2500:], result.stdout[-2500:])
                requests = server.requests
                assert all(len(images(body)) < 50 for _, body in requests)
                compactions = [body for compact, body in requests if compact]
                if case in ('48', 'disabled'):
                    assert not compactions
                else:
                    assert compactions and all(len(images(body)) == 49 for body in compactions)
                # Account for every unique original image exactly once across successful
                # summaries and the resumed raw tail (ignore the intentionally failed try).
                successful = [body for index, (compact, body) in enumerate(requests) if compact and index not in server.failed_indices]
                observed = [url for body in successful for url in images(body)] + images(requests[-1][1])
                assert observed == urls[:total], (case, 'missing, duplicated, reordered, or altered image payload')
                if case == 'code_batch':
                    tail = requests[-1][1]
                    assert any(item.get('input') == server.code and item.get('call_id') == 'code-batch' for item in tail)
                    assert 'source: original crop [1,2,3,4]' in json.dumps(tail)
                if case in ('tool_batch', 'code_batch'):
                    # Persisted replacement history must replay the same image bytes and
                    # completed call/result pairs when resuming the same thread.
                    before = images(requests[-1][1]); server.case = 'resume'
                    resumed = subprocess.run(command + ['exec', 'resume', '--json', '--skip-git-repo-check', thread_id, 'Finish the fixture.'],
                                             cwd=root, env=env, capture_output=True, text=True, timeout=120)
                    assert resumed.returncode == 0, resumed.stderr[-2000:]
                    assert images(server.requests[-1][1]) == before
                    assert any(json.loads(line).get('thread_id') == thread_id for line in resumed.stdout.splitlines() if line.startswith('{'))
                print(json.dumps({'case': case, 'passed': True, 'requests': [{'images': len(images(body)), 'compact': compact} for compact, body in requests]}), flush=True)
        finally:
            server.shutdown()


if __name__ == '__main__':
    main()
