"""Focused contract regressions; these do not render or judge a character."""
import copy
import json
from pathlib import Path
import unittest
import sys

from jsonschema import ValidationError
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'expressions'))
from validate_contract import validate_data

BASE = Path(__file__).resolve().parents[1] / 'expressions/examples'
RIG = json.loads((BASE / 'controls.example.json').read_text(encoding='utf-8'))
COMMAND = json.loads((BASE / 'command.example.json').read_text(encoding='utf-8'))


class ContractTests(unittest.TestCase):
    def test_example(self):
        validate_data(RIG, BASE / RIG['svg'], COMMAND)

    def test_invalid_rigs(self):
        def set_at(obj, path, value):
            for key in path[:-1]:
                obj = obj[key]
            obj[path[-1]] = value

        cases = [
            ('unknown field', ['script'], 'alert(1)'),
            ('missing SVG target', ['bindings', 'eye_aperture', 'svg_id'], 'missing'),
            ('bad default', ['parameters', 'eye.left.open', 'default'], 2),
            ('infinite value', ['parameters', 'eye.left.open', 'max'], float('inf')),
            ('invalid choice', ['parameters', 'eye.left.iris', 'default'], 'absent'),
            ('missing parameter', ['bindings', 'star_visible', 'parameter'], 'missing'),
            ('wrong topology', ['bindings', 'eye_aperture', 'keys', 0, 'd'], 'M 0 0 L 1 1 Z'),
            ('default shape drift', ['bindings', 'eye_aperture', 'keys', 1, 'd'], 'M 20 31 C 30 12 50 12 60 30 C 50 40 45 42 40 42 C 35 42 25 40 20 30 Z'),
            ('incomplete 2D grid', ['bindings', 'mouth_shape', 'keys'], RIG['bindings']['mouth_shape']['keys'][:-1]),
            ('duplicate morph point', ['bindings', 'eye_aperture', 'keys', 0, 'at'], [1]),
            ('unordered curve', ['bindings', 'tear_fade', 'keys'], [[0,0],[0.8,1],[0.7,1],[1,0]]),
            ('invalid opacity', ['bindings', 'tear_fade', 'keys', 1, 1], 2),
            ('wrong animation end', ['animations', 'star_pulse', 'tracks', 0, 'keys', 2, 'time_s'], 3),
            ('loop discontinuity', ['animations', 'star_pulse', 'tracks', 0, 'keys', 2, 'value'], 1.1),
            ('private parameter preset', ['expressions', 'starry', 'parameters'], {'star.pulse':1}),
            ('missing animation', ['expressions', 'starry', 'animations', 0, 'animation'], 'missing'),
            ('missing anchor', ['attachments', 'tear_origin', 'anchor'], 'missing'),
            ('missing attachment clock', ['attachments', 'tear_origin', 'clock'], 'missing'),
            ('self anchor', ['anchors', 'head_side', 'svg_id'], 'mark_motion'),
            ('duplicate property writer', ['bindings', 'second_writer'], RIG['bindings']['star_visible']),
        ]
        for name, path, value in cases:
            with self.subTest(name=name):
                rig = copy.deepcopy(RIG)
                set_at(rig, path, value)
                with self.assertRaises((ValueError, ValidationError)):
                    validate_data(rig, BASE / RIG['svg'])

    def test_invalid_commands(self):
        for action in [
            {'op':'set_parameters','values':{'mouth.open':4},'transition_s':0},
            {'op':'set_parameters','values':{'tear.phase':0.5},'transition_s':0},
            {'op':'set_parameters','values':{'nonexistent':1},'transition_s':0},
            {'op':'apply_expression','expression':'unknown','instance_id':'a','weight':1},
            {'op':'play_animation','animation':'unknown','instance_id':'a','speed':1,'weight':1},
            {'op':'play_animation','animation':'tear_flow','instance_id':'a','speed':-1,'weight':1},
            {'op':'execute','code':'anything'},
        ]:
            with self.subTest(action=action):
                command = copy.deepcopy(COMMAND)
                command['actions'] = [action]
                with self.assertRaises((ValueError, ValidationError)):
                    validate_data(RIG, BASE / RIG['svg'], command)


if __name__ == '__main__':
    unittest.main()
