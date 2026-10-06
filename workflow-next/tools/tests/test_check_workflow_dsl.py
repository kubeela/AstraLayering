"""Regression checks for explicit data sources and shared current artifacts."""

import copy
import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import yaml


TOOL = Path(__file__).resolve().parents[1] / 'check_workflow_dsl.py'
SPEC = importlib.util.spec_from_file_location('workflow_dsl', TOOL)
DSL = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(DSL)


class WorkflowDSLTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        (self.root / 'SKILL.md').write_text('---\nname: fixture\n---\n')
        (self.root / 'tools').mkdir()
        for name in ('preview.py', 'cursor.py'):
            (self.root / 'tools' / name).write_text('')
        self.configs = {}
        self.put('', {'working_dir': '{working_dir}', 'inputs': {
            'original': {'type': 'image', 'required': True},
        }, 'options': {'simplify': {'type': 'boolean'}}})
        self.task('1.reference', 'base_subject',
                  {'original': 'inputs.original'}, {'image': 'references/base.png'})
        self.task('2.groups', 'group_inventory',
                  {'reference': 'nodes.base_subject.image'}, {'groups': 'structure/groups.json'})
        self.task('3.block', 'group_layers',
                  {'reference': 'nodes.base_subject.image', 'groups': 'nodes.group_inventory.groups'},
                  {'guide_svg': 'block-layers/groups.svg'})
        self.dispatch_path = self.put('4.dispatch', {
            'id': 'refine_groups', 'working_dir': '{working_dir}',
            'inputs': {
                'reference': 'nodes.base_subject.image',
                'groups': 'nodes.group_inventory.groups',
                'guide_svg': 'nodes.group_layers.guide_svg',
                'preview_tool': {'asset': 'tools/preview.py'},
            },
            'dispatch': {
                'document': 'dispatch.inputs.groups',
                'state': 'structure/groups.dispatch.json',
                'tool': {'asset': 'tools/cursor.py'},
                'item': 'tool.next.target', 'order': 'breadth_first',
                'tree': {'root_key': 'groups', 'child_edges': {'groups': 'group', 'parts': 'part'},
                         'terminal_types': ['part'], 'dispatch_types': ['group']},
                'routes': {'group': {}}, 'fallback': 'templates/generic',
                'carry': {'guide_svg': 'dispatch.inputs.guide_svg'},
            },
            'outputs': {'groups': 'dispatch.inputs.groups', 'state': 'structure/groups.dispatch.json',
                        'guide_svg': 'carry.guide_svg'},
        })
        self.completion_path = self.task('templates/generic/1.complete', 'group_completion', {
            'group_path': 'dispatch.item.path', 'reference': 'dispatch.inputs.reference',
            'groups': 'dispatch.inputs.groups', 'guide_svg': 'carry.guide_svg',
            'preview_tool': 'dispatch.inputs.preview_tool',
        }, {
            'guide_svg': 'block-layers/groups.svg',
            'note': 'refinement/groups/{group_path}/1.complete/note.md',
        })

    def put(self, directory, config):
        path = self.root / directory / '流程.yaml'
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(yaml.safe_dump(config, allow_unicode=True, sort_keys=False))
        self.configs[path] = copy.deepcopy(config)
        return path

    def task(self, directory, identity, inputs, outputs):
        path = self.put(directory, {'id': identity, 'run': directory, 'worker': identity,
                                    'working_dir': '{working_dir}', 'inputs': inputs, 'outputs': outputs})
        (path.parent / '提示词.txt').write_text('Fixture task.')
        (path.parent / 'gpt-6-sol-xhigh.model').write_text('')
        return path

    def errors(self):
        result = []
        for path, config in self.configs.items():
            result.extend(DSL.validate_config(path, config))
        result.extend(DSL.validate_bindings(self.root, self.configs))
        return '\n'.join(result)

    def test_valid_workflow_and_root_input_keep_one_meaning(self):
        self.configs[self.completion_path]['inputs']['original'] = 'inputs.original'
        self.assertEqual(self.errors(), '')

    def test_removed_parallel_controls_are_rejected(self):
        for key in ('parallel', 'serial', 'aggregate'):
            with self.subTest(key=key):
                config = copy.deepcopy(self.configs[self.completion_path])
                config[key] = {}
                errors = '\n'.join(DSL.validate_config(self.completion_path, config))
                self.assertIn('unsupported node keys', errors)

    def test_dispatch_accepts_single_item_and_rejects_sequence_controls(self):
        self.assertEqual(self.errors(), '')
        for key in ('sequences', 'parallel', 'aggregate'):
            with self.subTest(key=key):
                config = copy.deepcopy(self.configs[self.dispatch_path])
                config['dispatch'][key] = {}
                errors = '\n'.join(DSL.validate_config(self.dispatch_path, config))
                self.assertIn('unsupported dispatch keys', errors)

    def test_draft_status_keeps_its_existing_meaning(self):
        for status in ('draft', 'ready'):
            self.configs[self.completion_path]['status'] = status
            self.assertEqual(self.errors(), '')
        self.configs[self.completion_path]['status'] = 'unknown'
        self.assertIn('status must be draft or ready', self.errors())

    def test_ordinary_task_cannot_read_its_local_parameter_as_root_input(self):
        path = self.root / '3.block' / '流程.yaml'
        self.configs[path]['inputs']['reference'] = 'inputs.reference'
        self.assertIn('inputs.reference is not a declared root input', self.errors())

    def test_loop_task_cannot_reinterpret_inputs_namespace(self):
        self.configs[self.completion_path]['inputs']['guide_svg'] = 'inputs.guide_svg'
        self.assertIn('inputs.guide_svg is not a declared root input', self.errors())

    def test_branch_alias_cannot_reinterpret_inputs_namespace(self):
        path = self.root / '1.reference' / '流程.yaml'
        self.configs[path] = {'id': 'base_subject', 'inputs': {'reference': 'inputs.original'},
                              'if': 'options.simplify == false',
                              'then': {'outputs': {'image': 'inputs.reference'}}}
        self.assertIn('inputs.reference is not a declared root input', self.errors())

    def test_upstream_output_must_exist(self):
        self.configs[self.completion_path]['inputs']['reference'] = 'nodes.base_subject.missing'
        self.assertIn('unknown upstream output', self.errors())

    def test_dispatch_input_must_be_declared_by_dispatcher(self):
        self.configs[self.completion_path]['inputs']['reference'] = 'dispatch.inputs.missing'
        self.assertIn('unknown dispatch binding', self.errors())

    def test_carry_key_must_exist(self):
        self.configs[self.completion_path]['inputs']['guide_svg'] = 'carry.missing'
        self.assertIn('unknown dispatch carry', self.errors())

    def test_carry_passthrough_is_valid_in_nodes_and_branches(self):
        alias = {'outputs': {'guide_svg': 'carry.guide_svg'}}
        upstream = {'outputs': {'guide_svg': 'nodes.group_layers.guide_svg'}}
        cases = {
            'node': {'id': 'group_completion', **alias},
            'then': {'id': 'group_completion', 'if': 'options.simplify == false',
                     'then': alias, 'else': upstream},
            'else': {'id': 'group_completion', 'if': 'options.simplify == false',
                     'then': upstream, 'else': alias},
        }
        for name, config in cases.items():
            with self.subTest(placement=name):
                self.configs[self.completion_path] = copy.deepcopy(config)
                self.assertEqual(self.errors(), '')

    def test_carry_passthrough_rejects_undeclared_artifact(self):
        self.configs[self.completion_path] = {
            'id': 'group_completion', 'if': 'options.simplify == false',
            'then': {'outputs': {'guide_svg': 'carry.guide_svg'}},
            'else': {'outputs': {'guide_svg': 'carry.missing'}},
        }
        self.assertIn('unknown dispatch carry: carry.missing', self.errors())

    def test_carry_passthrough_requires_dispatch_context(self):
        path = self.root / '1.reference' / '流程.yaml'
        self.configs[path] = {'id': 'base_subject',
                              'outputs': {'image': 'carry.guide_svg'}}
        self.assertIn('unknown dispatch carry: carry.guide_svg', self.errors())

    def test_carry_passthrough_rejects_extra_reference_segments(self):
        self.configs[self.completion_path] = {
            'id': 'group_completion',
            'outputs': {'guide_svg': 'carry.guide_svg.extra'},
        }
        self.assertIn('unknown dispatch carry: carry.guide_svg.extra', self.errors())

    def test_removed_dispatch_alias_is_rejected(self):
        self.configs[self.completion_path]['inputs']['guide_svg'] = 'dispatch.carry.guide_svg'
        self.assertIn('unknown dispatch binding', self.errors())

    def test_dispatch_seed_cannot_use_ambiguous_inputs_alias(self):
        self.configs[self.dispatch_path]['dispatch']['carry']['guide_svg'] = 'inputs.guide_svg'
        self.assertIn('dispatch.carry must map', self.errors())

    def test_redundant_template_container_config_is_rejected(self):
        self.put('templates/generic', {'id': 'generic', 'working_dir': '{working_dir}',
                                      'inputs': {'guide_svg': 'carry.guide_svg'},
                                      'outputs': {'guide_svg': 'nodes.group_completion.guide_svg'}})
        self.assertIn('numbered-child containers must omit 流程.yaml', self.errors())

    def test_shared_svg_is_updated_through_carry(self):
        self.assertEqual(self.errors(), '')

    def test_update_cannot_overwrite_a_different_input(self):
        self.configs[self.completion_path]['outputs']['guide_svg'] = 'references/base.png'
        self.assertIn('saved output overwrites an input artifact', self.errors())

    def test_update_cannot_overwrite_a_literal_input(self):
        self.configs[self.completion_path]['inputs']['guide_svg'] = 'existing/input.svg'
        self.configs[self.completion_path]['outputs']['guide_svg'] = 'existing/input.svg'
        self.assertIn('saved output overwrites an input artifact', self.errors())

    def test_declared_deliverables_cannot_be_temporary(self):
        self.configs[self.completion_path]['outputs']['note'] = 'tmp/{group_path}/1.complete/note.md'
        self.assertIn('declared deliverables must be saved outside temporary directories', self.errors())

    def test_output_placeholder_must_have_a_task_input(self):
        self.configs[self.completion_path]['outputs']['note'] = 'refinement/{missing}/1.complete/note.md'
        self.assertIn('placeholder {missing} has no declared task input', self.errors())

    def test_loop_can_publish_a_shared_path(self):
        self.configs[self.completion_path]['outputs']['note'] = 'refinement/1.complete/note.md'
        self.assertEqual(self.errors(), '')

    def test_same_named_artifact_can_update_an_upstream_node_output(self):
        path = self.root / '3.block' / '流程.yaml'
        self.configs[path]['outputs']['guide_svg'] = 'prior/groups.svg'
        self.configs[self.completion_path]['inputs']['guide_svg'] = 'nodes.group_layers.guide_svg'
        self.configs[self.completion_path]['outputs']['guide_svg'] = 'prior/groups.svg'
        self.assertEqual(self.errors(), '')

    def test_review_cannot_update_its_candidate(self):
        review = self.task('review', 'fixture_review', {}, {'report': 'reviews/report.md'})
        self.configs[self.completion_path]['review'] = {
            'run': 'review', 'working_dir': '{working_dir}',
            'inputs': {'guide_svg': 'nodes.group_layers.guide_svg'},
            'outputs': {'guide_svg': 'block-layers/groups.svg'},
        }
        # This directory is a resource for the embedded review, not a numbered task.
        del self.configs[review]
        self.assertIn('saved output overwrites an input artifact', self.errors())

    def test_valid_stage_to_stage_svg_handoff(self):
        self.task('templates/generic/2.split', 'group_split', {
            'group_path': 'dispatch.item.path',
            'guide_svg': 'nodes.group_completion.guide_svg',
        }, {'guide_svg': 'refinement/groups/{group_path}/2.split/groups.svg'})
        self.assertEqual(self.errors(), '')

    def test_later_stage_updates_the_same_current_carry(self):
        self.task('templates/generic/2.split', 'group_split', {
            'group_path': 'dispatch.item.path', 'guide_svg': 'carry.guide_svg',
        }, {'guide_svg': 'block-layers/groups.svg'})
        self.assertEqual(self.errors(), '')

    def test_node_reference_must_be_upstream_not_just_declared(self):
        self.configs[self.completion_path]['inputs']['guide_svg'] = 'nodes.group_split.guide_svg'
        self.task('templates/generic/2.split', 'group_split', {
            'group_path': 'dispatch.item.path', 'guide_svg': 'carry.guide_svg',
        }, {'guide_svg': 'refinement/groups/{group_path}/2.split/groups.svg'})
        self.assertIn('output is not from an earlier task', self.errors())

    def test_numbered_steps_follow_numeric_order(self):
        self.task('templates/generic/2.split', 'group_split', {
            'group_path': 'dispatch.item.path', 'guide_svg': 'carry.guide_svg',
        }, {'guide_svg': 'refinement/groups/{group_path}/2.split/groups.svg'})
        self.task('templates/generic/10.finish', 'group_finish', {
            'group_path': 'dispatch.item.path', 'guide_svg': 'nodes.group_split.guide_svg',
        }, {'guide_svg': 'refinement/groups/{group_path}/10.finish/groups.svg'})
        self.assertEqual(self.errors(), '')

    def test_command_line_fails_on_ambiguous_loop_input(self):
        command = [sys.executable, str(TOOL), str(self.root)]
        valid = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(valid.returncode, 0, valid.stderr)
        invalid = copy.deepcopy(self.configs[self.completion_path])
        invalid['inputs']['guide_svg'] = 'inputs.guide_svg'
        self.completion_path.write_text(yaml.safe_dump(invalid, sort_keys=False))
        result = subprocess.run(command, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('inputs.guide_svg is not a declared root input', result.stderr)


if __name__ == '__main__':
    unittest.main()
