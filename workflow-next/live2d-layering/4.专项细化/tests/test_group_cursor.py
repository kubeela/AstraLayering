"""CLI-level execution checks: BFS, serial mirrors, isolated carry and joins."""

import copy
import hashlib
import importlib.util
import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import xml.etree.ElementTree as ET

TOOL = Path(__file__).resolve().parents[1] / 'tools' / 'group_cursor.py'
SVG_NS = 'http://www.w3.org/2000/svg'


def svg(parts, defs=''):
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">'
            + ('<defs>' + defs + '</defs>' if defs else '') + ''.join(parts) + '</svg>')


def shape(path, color='#789', identity=None):
    return f'<g id="{identity or path.replace("/", "--")}" data-group-path="{path}"><path d="M0 0L10 0L10 10Z" fill="{color}"/></g>'


class GroupCursorTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.tree = self.root / 'structure/groups.json'
        self.tree.parent.mkdir()
        self.state = self.tree.with_name('groups.dispatch.json')
        self.document = {'groups': [
            {'name': 'head', 'groups': [{'name': 'face', 'groups': [{'name': 'eyes', 'groups': [
                {'name': 'left_eye', 'groups': []}, {'name': 'right_eye', 'groups': []}]}]}]},
            {'name': 'body', 'groups': [], 'parts': [{'name': 'torso'}]},
        ]}
        self.tree.write_text(json.dumps(self.document))
        self.guide = self.root / 'block-layers/groups.svg'
        self.guide.parent.mkdir()
        self.guide.write_text(svg([shape('head'), shape('body')]))
        self.serial = 0

    def command(self, *args, succeeds=True):
        args = list(args)
        if args[0] in {'complete', 'checkpoint', 'expand'} and '--worker' not in args:
            key = '--parent' if args[0] == 'expand' else '--target'
            target = args[args.index(key) + 1]
            args += ['--worker', 'fixture:' + target, '--worker-id', 'session:' + target]
        if args[0] in {'complete', 'expand'} and '--node' not in args:
            args += ['--node', 'split' if args[0] == 'expand' else 'route']
        result = subprocess.run([sys.executable, str(TOOL), '--file', str(self.tree), '--state', str(self.state), *args],
                                capture_output=True, text=True)
        if succeeds:
            self.assertEqual(result.returncode, 0, result.stderr)
            return json.loads(result.stdout)
        self.assertNotEqual(result.returncode, 0)
        return result.stderr

    def rejected(self, command='aggregate', *args, seed=None):
        process = subprocess.run([sys.executable, str(TOOL), '--file', str(self.tree), '--state', str(self.state), command, *args],
                                 capture_output=True, text=True,
                                 env={**os.environ, 'PYTHONHASHSEED': str(seed)} if seed is not None else None)
        self.assertNotEqual(process.returncode, 0, process.stdout)
        report = json.loads(process.stdout)
        self.assertEqual(process.returncode, {'rejected': 3, 'blocked': 4, 'tool_error': 5}[report['action']])
        return report

    def init(self, *extra):
        return self.command('init', '--working-dir', str(self.root), '--root-key', 'groups',
                            '--child-edge', 'groups:group', '--child-edge', 'parts:part',
                            '--terminal-type', 'part', '--dispatch-type', 'group',
                            '--route-name', 'group:eyes', '--carry', 'guide_svg=block-layers/groups.svg',
                            '--carry', 'artwork_svg=null', '--carry', 'rendering=null', *extra)

    def file(self, value):
        self.serial += 1
        path = self.root / f'message-{self.serial}.json'
        path.write_text(json.dumps(value))
        return str(path)

    def current(self, wave, name):
        return next(sequence for sequence in wave['sequences']
                    if sequence['current'] and sequence['current']['target']['path'] == name)

    def finish(self, sequence, outputs=None):
        args = ['complete', '--target', sequence['current']['target']['id']]
        if outputs is not None:
            args += ['--outputs', self.file(outputs)]
        return self.command(*args)

    def deliver_layer(self):
        wave = self.command('next')
        while not wave['aggregate_ready']:
            for sequence in wave['sequences']:
                if sequence['current']:
                    self.finish(sequence)
            wave = self.command('next')
        return self.command('aggregate')

    def test_layer_growth_is_local_until_join_and_next_depth_waits(self):
        self.assertEqual(self.init()['groups'], 6)
        self.assertEqual(self.init()['action'], 'already_initialized')
        wave = self.command('next')
        self.assertEqual(wave['depth'], 0)
        head, body = self.current(wave, 'head'), self.current(wave, 'body')
        self.assertNotEqual(head['working_dir'], body['working_dir'])
        original = self.tree.read_bytes()
        target = head['current']['target']['id']
        self.command('checkpoint', '--target', target, '--pointer', 'group_completion')
        self.command('expand', '--parent', target, '--patch', self.file({
            'groups': [{'name': 'headdress', 'groups': []}], 'parts': [{'name': 'head_base'}]}))
        self.assertEqual(self.tree.read_bytes(), original)
        self.assertNotIn('head/headdress', json.loads(self.state.read_text())['nodes'])
        self.assertIn('headdress', Path(head['inputs']['groups']).read_text())
        resumed = self.command('next')
        self.assertEqual(resumed['action'], 'active')
        self.assertEqual(self.current(resumed, 'head')['current']['pointer'], 'group_completion')
        self.finish(head)
        self.assertIn('requires every serial item', self.command('aggregate', succeeds=False))
        self.assertEqual(self.command('next')['depth'], 0)
        self.finish(body)
        self.command('aggregate')
        next_wave = self.command('next')
        self.assertEqual(next_wave['depth'], 1)
        self.assertEqual([s['items'][0]['path'] for s in next_wave['sequences']], ['head/face', 'head/headdress'])
        progress = json.loads(self.state.read_text())
        self.assertNotIn('head/head_base', progress['nodes'])
        self.assertEqual(progress['nodes']['head/face/eyes']['status'], 'pending')

    def test_mirror_order_serial_carry_and_checkpoint_restore(self):
        document = {'groups': [{'name': 'head', 'groups': [
            {'name': 'left_eye', 'groups': [], 'parts': [{'name': 'sclera'}]},
            {'name': 'right_eye', 'groups': [], 'parts': [{'name': 'sclera'}]}]}],
            'mirror_pairs': [{'name': 'eyes', 'members': ['head/right_eye', 'head/left_eye']}]}
        self.tree.write_text(json.dumps(document))
        self.init()
        self.deliver_layer()
        wave = self.command('next')
        self.assertEqual(len(wave['sequences']), 1)
        sequence = wave['sequences'][0]
        self.assertEqual([item['path'] for item in sequence['items']], ['head/right_eye', 'head/left_eye'])
        right, left = sequence['items']
        self.assertIn('current serial item', self.command('complete', '--target', left['id'], succeeds=False))
        directory = Path(sequence['working_dir'])
        drawing = directory / 'refinement/character.svg'
        drawing.parent.mkdir()
        drawing.write_text(svg([shape('head/right_eye')]))
        self.command('checkpoint', '--target', right['id'], '--pointer', 'part_contours',
                     '--outputs', self.file({'artwork_svg': 'refinement/character.svg'}))
        self.finish(sequence)
        resumed = self.command('next')['sequences'][0]
        self.assertEqual(resumed['current']['target']['path'], left['path'])
        self.assertEqual(resumed['carry']['artwork_svg'], str(drawing))
        self.assertIn('right_eye', Path(resumed['carry']['artwork_svg']).read_text())
        self.assertIsNone(json.loads(self.state.read_text())['carry']['artwork_svg'])
        drawing.write_text(svg([shape('head/right_eye'), shape('head/left_eye')]))
        self.finish(resumed)
        self.assertTrue(self.command('next')['aggregate_ready'])
        self.command('aggregate')
        self.assertEqual(self.command('next')['action'], 'done')
        self.assertTrue((self.root / 'refinement/character.svg').is_file())
        self.assertEqual(json.loads(self.state.read_text())['nodes'][left['path']]['status'], 'done')

    def test_two_sides_grow_lower_pairs_in_their_shared_workspace(self):
        document = {'groups': [{'name': 'head', 'groups': [
            {'name': 'right_eye', 'groups': []}, {'name': 'left_eye', 'groups': []}]}],
            'mirror_pairs': [{'name': 'eyes', 'members': ['head/right_eye', 'head/left_eye']}]}
        self.tree.write_text(json.dumps(document))
        self.init()
        self.deliver_layer()
        sequence = self.command('next')['sequences'][0]
        right = sequence['current']['target']
        self.command('expand', '--parent', right['id'], '--patch', self.file({
            'groups': [{'name': 'eyeball', 'groups': []}], 'parts': []}))
        self.finish(sequence)
        sequence = self.command('next')['sequences'][0]
        self.assertIn('eyeball', Path(sequence['inputs']['groups']).read_text())
        self.command('expand', '--parent', sequence['current']['target']['id'], '--patch', self.file({
            'groups': [{'name': 'eyeball', 'groups': []}], 'parts': [], 'mirror_pairs': [
                {'name': 'eyeballs', 'members': ['head/right_eye/eyeball', 'head/left_eye/eyeball']}]}))
        self.finish(sequence)
        self.command('aggregate')
        wave = self.command('next')
        self.assertEqual(wave['depth'], 2)
        self.assertEqual([item['path'] for item in wave['sequences'][0]['items']],
                         ['head/right_eye/eyeball', 'head/left_eye/eyeball'])
        self.assertNotIn('eyeballs', json.loads(self.state.read_text())['nodes'])

    def test_independent_svg_and_registry_changes_merge_in_plan_order(self):
        self.tree.write_text(json.dumps({'groups': [
            {'name': 'head', 'groups': [], 'parts': [{'name': 'face'}]},
            {'name': 'body', 'groups': [], 'parts': [{'name': 'torso'}]}]}))
        self.init()
        wave = self.command('next')
        # Finish in reverse order; joining must still use the plan order.
        for sequence in reversed(wave['sequences']):
            owner = sequence['current']['target']['path']
            directory = Path(sequence['working_dir'])
            guide = Path(sequence['carry']['guide_svg'])
            guide.write_text(svg([shape('head', '#123' if owner == 'head' else '#789'),
                                  shape('body', '#456' if owner == 'body' else '#789')]))
            drawing = directory / 'refinement/character.svg'
            drawing.parent.mkdir()
            drawing.write_text(svg([shape(owner), '<g id="shadow"><path fill="url(#shade)" d="M0 0L5 5"/></g>'],
                                   '<linearGradient id="shade"><stop offset="0" stop-color="#123"/></linearGradient>'))
            registry = directory / 'structure/rendering.json'
            registry.write_text(json.dumps({'layers': [{'id': 'shadow', 'type': 'cast_shadow',
                'owner': owner + '/' + ('face' if owner == 'head' else 'torso'),
                'follow': owner, 'clip_to': [owner]}]}))
            self.finish(sequence, {'guide_svg': 'block-layers/groups.svg', 'artwork_svg': 'refinement/character.svg',
                                   'rendering': 'structure/rendering.json'})
        self.command('aggregate')
        merged = ET.parse(self.root / 'refinement/character.svg').getroot()
        ids = [node.get('id') for node in merged.iter() if node.get('id')]
        self.assertEqual(len(ids), len(set(ids)))
        layers = json.loads((self.root / 'structure/rendering.json').read_text())['layers']
        self.assertEqual([layer['owner'] for layer in layers], ['head/face', 'body/torso'])
        self.assertTrue(all(layer['id'] in ids for layer in layers))
        self.assertTrue(all(re.fullmatch(r'[a-z][a-z0-9]*(?:_[a-z0-9]+)*', layer['id']) for layer in layers))
        final_guide = self.guide.read_text()
        self.assertIn('#123', final_guide)
        self.assertIn('#456', final_guide)
        self.assertEqual(self.command('aggregate')['action'], 'already_aggregated')

    def test_conflict_keeps_main_artifacts_and_ready_results_for_retry(self):
        self.init()
        wave = self.command('next')
        for sequence in wave['sequences']:
            directory = Path(sequence['working_dir'])
            registry = directory / 'structure/rendering.json'
            registry.write_text(json.dumps({'setting': sequence['id']}))
            self.finish(sequence, {'rendering': 'structure/rendering.json'})
        before = self.tree.read_bytes(), self.guide.read_bytes(), json.loads(self.state.read_text())
        self.assertIn('conflicting changes', self.command('aggregate', succeeds=False))
        saved = json.loads(self.state.read_text())
        rejection = saved.pop('rejection')
        old = before[2]
        old.pop('rejection')
        self.assertEqual((self.tree.read_bytes(), self.guide.read_bytes(), saved), before)
        self.assertTrue(self.command('next')['aggregate_ready'])
        self.command('repair', '--rejection', rejection['rejection_id'])
        for sequence in wave['sequences']:
            (Path(sequence['working_dir']) / 'structure/rendering.json').write_text('{"setting":"agreed"}')
            self.finish(sequence, {'rendering': 'structure/rendering.json'})
        self.command('aggregate')
        self.assertEqual(json.loads((self.root / 'structure/rendering.json').read_text()), {'setting': 'agreed'})

    def test_unrelated_geometry_change_is_rejected(self):
        self.init()
        wave = self.command('next')
        for sequence in wave['sequences']:
            self.finish(sequence)
        head = wave['sequences'][0]
        Path(head['carry']['guide_svg']).write_text(svg([shape('head'), shape('body', '#f00')]))
        self.assertIn('outside the sequence', self.command('aggregate', succeeds=False))
        self.assertNotIn('#f00', self.guide.read_text())

    def test_shared_foreign_gradient_change_is_rejected(self):
        self.guide.write_text(svg([shape('head', 'url(#shade)'), shape('body', 'url(#shade)')],
                                 '<linearGradient id="shade"><stop stop-color="#123"/></linearGradient>'))
        self.init()
        wave = self.command('next')
        for sequence in wave['sequences']:
            self.finish(sequence)
        local = Path(wave['sequences'][0]['carry']['guide_svg'])
        local.write_text(local.read_text().replace('#123', '#456'))
        self.assertIn('shared resource changed', self.command('aggregate', succeeds=False))
        self.assertIn('#123', self.guide.read_text())

    def test_registered_own_effect_can_change_but_foreign_effect_cannot(self):
        self.tree.write_text(json.dumps({'groups': [
            {'name': 'head', 'groups': [], 'parts': [{'name': 'face'}]},
            {'name': 'body', 'groups': [], 'parts': [{'name': 'torso'}]}]}))
        artwork = self.root / 'refinement/character.svg'
        artwork.parent.mkdir()
        artwork.write_text(svg([shape('head'), shape('body'),
            '<g id="head_shadow"><path fill="#123"/></g><g id="body_shadow"><path fill="#456"/></g>']))
        registry = self.root / 'structure/rendering.json'
        registry.write_text(json.dumps({'layers': [
            {'id': name + '_shadow', 'type': 'cast_shadow', 'owner': name,
             'follow': name, 'clip_to': [name]} for name in ('head', 'body')]}))
        self.command('init', '--working-dir', str(self.root), '--root-key', 'groups',
                     '--child-edge', 'groups:group', '--child-edge', 'parts:part', '--terminal-type', 'part',
                     '--dispatch-type', 'group', '--carry', 'guide_svg=block-layers/groups.svg',
                     '--carry', 'artwork_svg=refinement/character.svg', '--carry', 'rendering=structure/rendering.json')
        wave = self.command('next')
        for sequence in wave['sequences']:
            self.finish(sequence)
        local = Path(wave['sequences'][0]['carry']['artwork_svg'])
        original = local.read_text()
        local.write_text(original.replace('#456', '#789'))
        self.assertIn('outside the sequence', self.command('aggregate', succeeds=False))
        rejection = json.loads(self.state.read_text())['rejection']
        self.command('repair', '--rejection', rejection['rejection_id'])
        local.write_text(original.replace('#123', '#abc'))
        self.finish(wave['sequences'][0])
        other = Path(wave['sequences'][1]['carry']['artwork_svg'])
        other.write_text(other.read_text().replace('#456', '#def'))
        self.command('aggregate')
        self.assertIn('#abc', artwork.read_text())
        self.assertIn('#def', artwork.read_text())

    def test_foreign_registry_change_is_rejected(self):
        self.init()
        wave = self.command('next')
        head = wave['sequences'][0]
        registry = Path(head['working_dir']) / 'structure/rendering.json'
        registry.write_text(json.dumps({'layers': [{'id': 'effect', 'type': 'cast_shadow',
                            'owner': 'body/torso', 'follow': 'body', 'clip_to': ['body']}]}))
        self.finish(head, {'rendering': 'structure/rendering.json'})
        self.finish(wave['sequences'][1])
        self.assertIn('outside the sequence', self.command('aggregate', succeeds=False))

    def test_invalid_expansion_rolls_back_local_tree_and_progress(self):
        self.init()
        head = self.current(self.command('next'), 'head')
        path = Path(head['inputs']['groups'])
        before = path.read_bytes(), self.state.read_bytes(), self.tree.read_bytes()
        for patch_value in [
            {'groups': [{'name': 'face', 'groups': []}]},
            {'groups': [{'name': 'extra', 'groups': [{'name': 'nested', 'groups': []}]}]},
            {'groups': [{'name': 'eye', 'groups': []}], 'mirror_pairs': [
                {'name': 'pair', 'members': ['head/eye', 'head/missing']}]},
        ]:
            self.command('expand', '--parent', head['current']['target']['id'],
                         '--patch', self.file(patch_value), succeeds=False)
            self.assertEqual((path.read_bytes(), self.state.read_bytes(), self.tree.read_bytes()), before)

    def test_parallel_checkpoints_do_not_lose_updates(self):
        self.init()
        wave = self.command('next')
        processes = [subprocess.Popen([sys.executable, str(TOOL), '--file', str(self.tree), '--state', str(self.state),
                                       'checkpoint', '--target', sequence['current']['target']['id'],
                                       '--pointer', sequence['id'], '--worker', 'fixture:' + sequence['id']],
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                     for sequence in wave['sequences']]
        for process in processes:
            out, err = process.communicate()
            self.assertEqual(process.returncode, 0, err)
        resumed = self.command('next')
        self.assertTrue(all(sequence['current']['pointer'] == sequence['id'] for sequence in resumed['sequences']))

    def test_completed_direct_structure_requires_reopen(self):
        self.init()
        self.deliver_layer()
        changed = json.loads(self.tree.read_text())
        changed['groups'][1]['parts'].append({'name': 'extra'})
        self.tree.write_text(json.dumps(changed))
        self.assertIn('completed node changed direct children', self.command('next', succeeds=False))
        changed['groups'][1]['parts'].pop()
        self.tree.write_text(json.dumps(changed))
        self.command('reopen', '--target', 'body')
        wave = self.command('next')
        body = self.current(wave, 'body')
        self.command('expand', '--parent', body['current']['target']['id'], '--patch', self.file({'parts': [{'name': 'extra'}]}))
        self.finish(body)
        self.command('aggregate')
        self.assertEqual(json.loads(self.state.read_text())['nodes']['body']['status'], 'done')

    def test_arbitrary_tree_edges_and_terminal_types_still_work(self):
        self.tree.write_text(json.dumps({'nodes': [{'name': 'root', 'branches': [
            {'name': 'branch', 'atoms': [{'name': 'detail'}]}]}]}))
        self.command('init', '--working-dir', str(self.root), '--root-key', 'nodes', '--child-edge', 'nodes:branch',
                     '--child-edge', 'branches:branch', '--child-edge', 'atoms:atom', '--terminal-type', 'atom',
                     '--dispatch-type', 'branch')
        self.deliver_layer()
        self.assertEqual(self.command('next')['sequences'][0]['items'][0]['path'], 'root/branch')
        self.deliver_layer()
        self.assertEqual(self.command('next')['action'], 'done')
        self.assertNotIn('root/branch/detail', json.loads(self.state.read_text())['nodes'])

    def test_output_update_does_not_reset_other_carry_keys(self):
        self.init()
        sequence = self.command('next')['sequences'][0]
        directory = Path(sequence['working_dir'])
        artifact = directory / 'refinement/character.svg'
        artifact.parent.mkdir()
        artifact.write_text(svg([shape('head')]))
        self.command('checkpoint', '--target', sequence['current']['target']['id'], '--pointer', 'geometry',
                     '--outputs', self.file({'artwork_svg': str(artifact)}))
        self.command('checkpoint', '--target', sequence['current']['target']['id'], '--pointer', 'note')
        current = self.command('next')['sequences'][0]
        self.assertEqual(current['carry']['artwork_svg'], str(artifact))
        self.assertEqual(current['carry']['guide_svg'], sequence['carry']['guide_svg'])
        self.assertIsNone(current['carry']['rendering'])
        self.assertEqual(current['current']['nodes']['geometry'], {'artwork_svg': 'refinement/character.svg'})
        self.assertEqual(current['current']['nodes']['note'], {})
        self.assertEqual(self.command('next')['sequences'][1]['current']['nodes'], {})
        self.assertIn('cannot be reset', self.command('checkpoint', '--target', sequence['current']['target']['id'],
                      '--pointer', 'bad', '--outputs', self.file({'artwork_svg': None}), succeeds=False))

    def test_read_only_binding_and_main_changes_are_detected(self):
        reference = self.root / 'reference.png'
        reference.write_bytes(b'reference')
        self.init('--binding', 'reference=reference.png')
        wave = self.command('next')
        sequence = wave['sequences'][0]
        Path(sequence['inputs']['reference']).write_bytes(b'changed')
        for item in wave['sequences']:
            self.finish(item)
        self.assertIn('read-only input changed', self.command('aggregate', succeeds=False))
        rejection = json.loads(self.state.read_text())['rejection']
        self.command('repair', '--rejection', rejection['rejection_id'])
        Path(sequence['inputs']['reference']).write_bytes(b'reference')
        self.finish(sequence)
        reference.write_bytes(b'main changed')
        self.assertIn('main artifact changed', self.command('aggregate', succeeds=False))

    def test_sequence_option_changes_are_local(self):
        options = self.root / 'options.json'
        options.write_text('{"simplify":false}')
        self.init()
        wave = self.command('next')
        head_options = Path(wave['sequences'][0]['working_dir']) / 'options.json'
        head_options.write_text('{"simplify":false,"needs_drawing":false}')
        body_options = Path(wave['sequences'][1]['working_dir']) / 'options.json'
        self.assertNotIn('needs_drawing', body_options.read_text())
        for sequence in wave['sequences']:
            self.finish(sequence)
        self.command('aggregate')
        self.assertEqual(options.read_text(), '{"simplify":false}')

    def test_journal_recovers_interrupted_publication(self):
        self.init()
        wave = self.command('next')
        for sequence in wave['sequences']:
            self.finish(sequence)
        spec = importlib.util.spec_from_file_location('cursor_test', TOOL)
        cursor = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cursor)
        state = cursor.read_json(self.state)
        entries, by_id = cursor.reconcile(cursor.read_json(self.tree), state)
        merged, info = cursor.merge_round(state, entries, by_id)
        original = cursor.atomic_bytes
        calls = 0
        def interrupted(path, data):
            nonlocal calls
            calls += 1
            # Stage two payloads, then fail while publishing the second.
            if calls == len(merged[0]) + 2:
                raise OSError('simulated interruption')
            return original(path, data)
        with patch.object(cursor, 'atomic_bytes', interrupted), self.assertRaises(OSError):
            cursor.publish(state, merged, info, self.state)
        self.assertIsNotNone(json.loads(self.state.read_text())['publishing'])
        resumed = self.command('next')
        self.assertEqual(resumed['depth'], 1)
        self.assertIsNone(json.loads(self.state.read_text())['publishing'])
        self.assertEqual(json.loads(self.state.read_text())['nodes']['body']['status'], 'done')

    def test_idle_old_state_migration_preserves_ids_and_completion(self):
        tree_spec = {'root_key': 'groups', 'child_edges': {'groups': 'group', 'parts': 'part'},
                     'terminal_types': ['part'], 'dispatch_types': ['group']}
        self.state.write_text(json.dumps({'version': 4, 'tree': tree_spec, 'routes': {'group': ['eyes']},
            'next_id': 2, 'nodes': {'body': {'id': 'n1', 'kind': 'group', 'status': 'done',
                                           'completed_children': ['body/torso']}}, 'active': None}))
        self.assertEqual(self.init()['action'], 'migrated')
        record = json.loads(self.state.read_text())['nodes']['body']
        self.assertEqual(record['id'], 'n1')
        self.assertEqual(record['status'], 'done')

    def mirror_layer(self):
        self.tree.write_text(json.dumps({'groups': [
            {'name': 'head', 'groups': [
                {'name': 'right_eye', 'groups': [], 'parts': [{'name': 'sclera'}]},
                {'name': 'left_eye', 'groups': [], 'parts': [{'name': 'sclera'}]}]},
            {'name': 'body', 'groups': [{'name': 'torso', 'groups': [], 'parts': [{'name': 'skin'}]}]}],
            'mirror_pairs': [{'name': 'eyes', 'members': ['head/right_eye', 'head/left_eye']}]}))
        self.init()
        self.deliver_layer()
        return self.command('next')

    def draw(self, sequence, text):
        drawing = Path(sequence['working_dir']) / 'refinement/character.svg'
        drawing.parent.mkdir(exist_ok=True)
        drawing.write_text(text)
        self.finish(sequence, {'artwork_svg': 'refinement/character.svg'})
        return drawing

    def test_global_css_first_artwork_rejected_with_actual_worker_then_repairs_join(self):
        self.init()
        wave = self.command('next')
        for sequence in wave['sequences']:
            path = sequence['current']['target']['path']
            self.draw(sequence, svg([f'<style id="{path}_style">.paint {{fill:{"red" if path == "head" else "blue"}}}</style>',
                                     f'<g id="{path}" data-group-path="{path}"><path class="paint" d="M0 0L10 0L10 10Z"/></g>']))
        original = self.tree.read_bytes(), self.guide.read_bytes()
        for target, color in [('head', 'red'), ('body', 'blue')]:
            report = self.rejected()
            self.assertEqual(report['code'], 'svg_global_style')
            repair = report['repairs'][0]
            self.assertEqual(repair['target']['path'], target)
            self.assertEqual(repair['worker'], 'fixture:' + repair['target']['id'])
            self.assertEqual(repair['worker_id'], 'session:' + repair['target']['id'])
            self.assertEqual(report['artifact'], 'artwork_svg')
            self.assertIn(target + '_style', report['location'])
            self.assertFalse((self.root / 'refinement/character.svg').exists())
            self.assertEqual((self.tree.read_bytes(), self.guide.read_bytes()), original)
            self.command('repair', '--rejection', report['rejection_id'])
            selected = self.current(self.command('next'), target)
            self.draw(selected, svg([shape(target, color)]))
        self.command('aggregate')
        final = (self.root / 'refinement/character.svg').read_text()
        self.assertIn('red', final)
        self.assertIn('blue', final)
        self.assertNotIn('<style', final)

    def test_earlier_serial_fault_replays_dependents_keeps_unrelated_sequence_and_growth(self):
        wave = self.mirror_layer()
        eyes, torso = wave['sequences']
        right = eyes['current']['target']
        self.command('expand', '--parent', right['id'], '--patch', self.file({'groups': [{'name': 'eyeball', 'groups': []}]}))
        self.draw(eyes, svg([shape(right['path']), '<style id="bad">.paint{fill:red}</style>']))
        left_sequence = self.command('next')['sequences'][0]
        left = left_sequence['current']['target']
        self.draw(left_sequence, svg([shape(right['path']), shape(left['path']), '<style id="bad">.paint{fill:red}</style>']))
        self.finish(torso)
        unaffected = Path(torso['inputs']['groups']).read_bytes()
        report = self.rejected()
        repair = report['repairs'][0]
        self.assertEqual(repair['target'], {'id': right['id'], 'path': right['path']})
        self.assertEqual(repair['worker_id'], 'session:' + right['id'])
        self.assertEqual([item['target']['id'] for item in repair['invalidated']], [left['id']])
        self.command('repair', '--rejection', report['rejection_id'])
        resumed = self.command('next')
        self.assertTrue(resumed['sequences'][1]['ready'])
        self.assertEqual(Path(torso['inputs']['groups']).read_bytes(), unaffected)
        eyes = resumed['sequences'][0]
        self.assertIsNone(eyes['carry']['artwork_svg'])
        self.assertFalse((Path(eyes['working_dir']) / 'refinement/character.svg').exists())
        self.assertNotIn('eyeball', Path(eyes['inputs']['groups']).read_text())
        self.assertIn('<style', Path(eyes['current']['repair']['rejected_outputs']['artwork_svg']).read_text())
        self.assertEqual(eyes['current']['workers']['route']['worker_id'], 'session:' + right['id'])
        self.command('expand', '--parent', right['id'], '--patch', self.file({'groups': [{'name': 'eyeball', 'groups': []}]}))
        self.draw(eyes, svg([shape(right['path'], '#abc')]))
        eyes = self.command('next')['sequences'][0]
        self.assertIn('#abc', Path(eyes['carry']['artwork_svg']).read_text())
        self.command('expand', '--parent', left['id'], '--patch', self.file({
            'groups': [{'name': 'eyeball', 'groups': []}], 'mirror_pairs': [
                {'name': 'eyeballs', 'members': [right['path'] + '/eyeball', left['path'] + '/eyeball']}]}))
        self.draw(eyes, svg([shape(right['path'], '#abc'), shape(left['path'], '#def')]))
        self.command('aggregate')
        next_wave = self.command('next')
        self.assertEqual(next_wave['depth'], 2)
        self.assertEqual([item['path'] for item in next_wave['sequences'][0]['items']],
                         ['head/right_eye/eyeball', 'head/left_eye/eyeball'])

    def test_later_serial_fault_keeps_successful_prefix_and_refuses_wrong_worker(self):
        wave = self.mirror_layer()
        eyes, torso = wave['sequences']
        right = eyes['current']['target']
        self.draw(eyes, svg([shape(right['path'], '#abc')]))
        eyes = self.command('next')['sequences'][0]
        left = eyes['current']['target']
        self.draw(eyes, svg([shape(right['path'], '#abc'), shape(left['path']), '<style id="bad"/>']))
        self.finish(torso)
        report = self.rejected()
        self.assertEqual(report['repairs'][0]['target']['id'], left['id'])
        self.assertEqual(report['repairs'][0]['invalidated'], [])
        self.command('repair', '--rejection', report['rejection_id'])
        eyes = self.command('next')['sequences'][0]
        self.assertEqual(eyes['current']['target']['id'], left['id'])
        self.assertIn('#abc', Path(eyes['carry']['artwork_svg']).read_text())
        self.assertNotIn('bad', Path(eyes['carry']['artwork_svg']).read_text())
        self.command('complete', '--target', left['id'], '--worker', 'wrong', '--node', 'route', succeeds=False)
        self.assertFalse(self.command('next')['aggregate_ready'])
        self.draw(eyes, svg([shape(right['path'], '#abc'), shape(left['path'], '#def')]))
        self.command('aggregate')
        self.assertEqual(json.loads(self.state.read_text())['nodes'][right['path']]['status'], 'done')

    def test_conflict_report_identifies_all_writers_and_is_hash_seed_independent(self):
        self.init()
        wave = self.command('next')
        for index, sequence in enumerate(wave['sequences']):
            registry = Path(sequence['working_dir']) / 'structure/rendering.json'
            registry.write_text(json.dumps({'setting': index}))
            self.finish(sequence, {'rendering': 'structure/rendering.json'})
        a, b = self.rejected(seed=1), self.rejected(seed=987)
        self.assertEqual(a, b)
        self.assertEqual(a['location'], '$/setting')
        self.assertEqual([item['target']['path'] for item in a['repairs']], ['head', 'body'])
        self.assertEqual([item['worker_id'] for item in a['repairs']], ['session:n1', 'session:n6'])
        self.assertEqual(self.command('next')['rejection'], a)
        self.command('repair', '--rejection', a['rejection_id'])
        self.assertTrue(all(not item['ready'] for item in self.command('next')['sequences']))

    def test_corrupt_output_missing_output_and_external_reference_have_attribution(self):
        for content in ['<svg', svg([shape('head'), '<use href="#missing"/>']),
                        svg([shape('head'), '<image href="https://example.org/a.png"/>'])]:
            with self.subTest(content=content):
                # Use a fresh ready round for each representation fault.
                if self.state.exists():
                    self.state.unlink()
                self.init()
                wave = self.command('next')
                drawing = self.draw(wave['sequences'][0], content)
                self.finish(wave['sequences'][1])
                report = self.rejected()
                self.assertEqual(report['repairs'][0]['worker_id'], 'session:n1')
                self.assertEqual(report['artifact'], 'artwork_svg')
        self.command('repair', '--rejection', report['rejection_id'])
        wave = self.command('next')
        drawing = self.draw(wave['sequences'][0], svg([shape('head')]))
        drawing.unlink()
        report = self.rejected()
        self.assertEqual(report['repairs'][0]['worker_id'], 'session:n1')

    def test_stale_rejection_and_changed_main_are_blocked_without_worker_blame(self):
        self.init()
        wave = self.command('next')
        drawing = self.draw(wave['sequences'][0], svg([shape('head'), '<style/>']))
        self.finish(wave['sequences'][1])
        report = self.rejected()
        stale = self.rejected('repair', '--rejection', 'wrong')
        self.assertEqual(stale['repairs'], [])
        drawing.write_text(svg([shape('head')]))
        self.assertEqual(self.rejected()['action'], 'blocked')
        drawing.write_text(svg([shape('head'), '<style/>']))
        self.command('repair', '--rejection', report['rejection_id'])
        self.draw(self.command('next')['sequences'][0], svg([shape('head')]))
        self.guide.write_text(self.guide.read_text().replace('#789', '#fff'))
        changed = self.rejected()
        self.assertEqual(changed['code'], 'main_artifact_changed')
        self.assertEqual(changed['repairs'], [])

    def test_repair_journal_recovers_interruption_and_keeps_checkpoints(self):
        wave = self.mirror_layer()
        eyes, torso = wave['sequences']
        right = eyes['current']['target']
        self.draw(eyes, svg([shape(right['path']), '<style/>']))
        eyes = self.command('next')['sequences'][0]
        left = eyes['current']['target']
        self.draw(eyes, svg([shape(right['path']), shape(left['path']), '<style/>']))
        self.finish(torso)
        report = self.rejected()
        spec = importlib.util.spec_from_file_location('cursor_repair_test', TOOL)
        cursor = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cursor)
        state = cursor.read_json(self.state)
        merged, info = cursor.prepare_repair(state, report['rejection_id'])
        original = cursor.atomic_bytes
        writes = sum(content is not None for content in merged[0].values())
        count = 0
        def interrupted(path, data):
            nonlocal count
            count += 1
            if count == writes + 2:
                raise OSError('simulated repair interruption')
            original(path, data)
        with patch.object(cursor, 'atomic_bytes', interrupted), self.assertRaises(OSError):
            cursor.publish(state, merged, info, self.state, kind='repair')
        self.assertIsNotNone(json.loads(self.state.read_text())['publishing'])
        resumed = self.command('next')
        self.assertEqual(resumed['sequences'][0]['current']['target']['id'], right['id'])
        self.assertTrue(resumed['sequences'][1]['ready'])
        self.assertTrue((self.root / json.loads(self.state.read_text())['active']['baseline']).is_dir())

    def test_internal_failure_is_not_assigned_to_a_drawing_worker(self):
        self.init()
        wave = self.command('next')
        for sequence in wave['sequences']:
            self.finish(sequence)
        spec = importlib.util.spec_from_file_location('cursor_error_test', TOOL)
        cursor = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cursor)
        report = cursor.failure_report(RuntimeError('injected tool bug'), cursor.read_json(self.state))
        self.assertEqual(report['action'], 'tool_error')
        self.assertEqual(report['repairs'], [])


if __name__ == '__main__':
    unittest.main()
