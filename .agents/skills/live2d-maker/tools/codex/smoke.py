#!/usr/bin/env python3
"""Exercise the patched native runtime against local mock APIs; no real key/model."""
import argparse
import base64
import json
import os
from pathlib import Path
import struct
import subprocess
import tempfile
import threading
import zlib
from email.parser import BytesParser
from email.policy import default
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def fixture_png(color=b'\x60\x80\xa0'):
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 32, 32, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress((b'\0' + color * 32) * 32)) + chunk(b'IEND', b''))


PNG = fixture_png()


def image_count(value):
    if isinstance(value, list):
        return sum(map(image_count, value))
    if isinstance(value, dict):
        return int(value.get('type') == 'input_image') + sum(map(image_count, value.values()))
    return 0


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_POST(self):
        raw = self.rfile.read(int(self.headers['Content-Length']))
        if self.path.startswith('/images/v1/images/'):
            assert self.headers['Authorization'] == 'Bearer local-image-fixture'
            if self.path.endswith('/edits'):
                message = BytesParser(policy=default).parsebytes(
                    ('Content-Type: ' + self.headers['Content-Type'] + '\r\nMIME-Version: 1.0\r\n\r\n').encode() + raw)
                fields = {}; uploads = []
                for part in message.iter_parts():
                    name = part.get_param('name', header='content-disposition')
                    if name == 'image[]':
                        uploads.append(part.get_payload(decode=True))
                    else:
                        fields[name] = part.get_payload(decode=True).decode()
                assert uploads == [PNG]
            else:
                fields = json.loads(raw)
            assert fields['model'] == 'gpt-image-2.5-sunburst'
            self.server.image_calls.append(self.path)
            data = json.dumps({'created': 1, 'data': [{'b64_json': base64.b64encode(PNG).decode(), 'generation_id': 'local-fixture'}]}).encode()
            self.send_response(200); self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)
            return
        assert self.path == '/chat/v1/responses', self.path
        assert self.headers['Authorization'] == 'Bearer local-chat-fixture'
        body = json.loads(raw)
        count = image_count(body.get('input', []))
        metadata = json.loads(body.get('client_metadata', {}).get('x-codex-turn-metadata', '{}'))
        compact = metadata.get('request_kind') == 'compaction'
        self.server.calls.append({'images': count, 'compact': compact})
        if count >= 50:
            self.send_response(400); self.end_headers()
            self.wfile.write(b'{"error":{"message":"Exceeded maximum number of images (50)"}}')
            return
        idx = len(self.server.calls); rid = f'resp_{idx}'
        text = 'Checkpoint: retain the task and continue.' if compact else 'LOCAL_MOCK_DONE'
        items = [{'type': 'message', 'role': 'assistant', 'id': f'msg_{idx}', 'content': [{'type': 'output_text', 'text': text}]}]
        def view(call_id):
            return {'type': 'function_call', 'name': 'view_image', 'call_id': call_id, 'arguments': json.dumps({'path': str(self.server.picture)})}
        if self.server.case == 53 and idx == 2:
            items = [view('restore-vision')]
        if self.server.case == 'tool_batch' and idx == 1:
            items = [view(f'batch-{i}') for i in range(53)]
        if self.server.case in ('image_routes', 'code_mode') and idx <= 2:
            args = {'prompt': 'Local native tool fixture', 'transparent_background': True}
            if idx == 2:
                args['referenced_image_paths'] = [str(self.server.picture)]
            items = [{'type': 'function_call', 'namespace': 'image_gen', 'name': 'imagegen', 'call_id': f'gen-{idx}', 'arguments': json.dumps(args)}]
            if self.server.case == 'code_mode':
                items = [{'type': 'custom_tool_call', 'name': 'exec', 'call_id': f'code-{idx}',
                          'input': 'const result = await tools.image_gen__imagegen(' + json.dumps(args) + '); generatedImage(result);'}]
        events = [{'type': 'response.created', 'response': {'id': rid}}]
        events += [{'type': 'response.output_item.done', 'item': item} for item in items]
        events += [{'type': 'response.completed', 'response': {'id': rid, 'usage': {'input_tokens': 100, 'output_tokens': 20, 'total_tokens': 120}}}]
        data = ''.join('data: ' + json.dumps(event) + '\n\n' for event in events).encode()
        self.send_response(200); self.send_header('Content-Type', 'text/event-stream')
        self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--codex', type=Path, default=Path(__file__).resolve().parents[2] / '.codex-build/bin/codex')
    parser.add_argument('--case', choices=['48', '49', '53', 'tool_batch', 'disabled', 'image_routes', 'code_mode'])
    args = parser.parse_args()
    binary = args.codex.resolve()
    with tempfile.TemporaryDirectory(prefix='layering-native-smoke-') as directory:
        root = Path(directory); pic = root / 'reference.png'; pic.write_bytes(PNG)
        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{server.server_port}'
        try:
            cases = [int(args.case) if args.case.isdigit() else args.case] if args.case else [48, 49, 53, 'tool_batch', 'disabled', 'image_routes', 'code_mode']
            for case in cases:
                server.case = case; server.calls = []; server.image_calls = []; server.picture = pic
                home = root / str(case); home.mkdir()
                env = {key: value for key, value in os.environ.items() if not key.startswith(('LAYERING_', 'ASTRA_TEMP_'))}
                env.update(CODEX_HOME=str(home), LAYERING_IMAGE_COMPACT_THRESHOLD='' if case == 'disabled' else '49',
                           LOCAL_CHAT_KEY='local-chat-fixture')
                if case in ('image_routes', 'code_mode'):
                    env.update(LAYERING_IMAGE_BASE_URL=base + '/images/v1', LAYERING_IMAGE_API_KEY='local-image-fixture', LAYERING_IMAGE_MODEL='gpt-image-2.5-sunburst')
                config = {'model': 'gpt-6-astra', 'model_provider': 'local_fixture', 'model_auto_compact_token_limit': 256000,
                          'features.code_mode': case == 'code_mode', 'features.code_mode_only': case == 'code_mode',
                          'features.image_generation': case in ('image_routes', 'code_mode'),
                          'model_providers.local_fixture.name': 'Local fixture', 'model_providers.local_fixture.base_url': base + '/chat/v1',
                          'model_providers.local_fixture.env_key': 'LOCAL_CHAT_KEY', 'model_providers.local_fixture.wire_api': 'responses',
                          'model_providers.local_fixture.requires_openai_auth': False,
                          'model_providers.local_fixture.stream_max_retries': 0, 'model_providers.local_fixture.request_max_retries': 0}
                command = [str(binary), '--no-daemon']
                for key, value in config.items():
                    command += ['-c', key + '=' + json.dumps(value)]
                start = command + ['exec', '--json', '--skip-git-repo-check']
                if isinstance(case, int) or case == 'disabled':
                    start += ['--image', ','.join([str(pic)] * (case if isinstance(case, int) else 49))]
                start += ['--', 'Inspect references for the local transport fixture, then finish.']
                result = subprocess.run(start, cwd=root, env=env, capture_output=True, text=True, timeout=90)
                assert result.returncode == 0, result.stderr[-4000:] + result.stdout[-4000:]
                expected = [{'images': 49, 'compact': True}, {'images': 0, 'compact': False}]
                if case == 48 or case == 'disabled':
                    expected = [{'images': 48 if case == 48 else 49, 'compact': False}]
                elif case == 53:
                    expected = [{'images': 49, 'compact': True}, {'images': 4, 'compact': False}, {'images': 5, 'compact': False}]
                elif case == 'tool_batch':
                    expected = [{'images': 0, 'compact': False}, {'images': 49, 'compact': True}, {'images': 4, 'compact': False}]
                if case in ('image_routes', 'code_mode'):
                    assert server.image_calls == ['/images/v1/images/generations', '/images/v1/images/edits'], (server.image_calls, result.stdout[-4000:])
                    generated = [file for file in home.rglob('*.png') if file.read_bytes() == PNG]
                    assert len(generated) >= 2, ('native image artifacts missing', result.stdout[-4000:])
                else:
                    assert server.calls == expected, (case, server.calls, expected)
                # Resume an actually compacted persistent thread; never create a replacement.
                if case == 'tool_batch':
                    events = [json.loads(line) for line in result.stdout.splitlines() if line.startswith('{')]
                    thread_id = next(event['thread_id'] for event in events if event.get('type') == 'thread.started')
                    server.case = 'resume'
                    resumed = subprocess.run(command + ['exec', 'resume', '--json', '--skip-git-repo-check', thread_id, 'Finish the local fixture.'], cwd=root, env=env, capture_output=True, text=True, timeout=90)
                    assert resumed.returncode == 0, resumed.stderr
                    assert any(json.loads(line).get('thread_id') == thread_id for line in resumed.stdout.splitlines() if line.startswith('{'))
                print(json.dumps({'case': case, 'passed': True, 'requests': server.calls, 'image_routes': server.image_calls}), flush=True)
        finally:
            server.shutdown()


if __name__ == '__main__':
    main()
