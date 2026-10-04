"""Exercise joins with shared SVG resources and conflicting branch edits."""

import copy
from pathlib import Path
import re
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from merge_artifacts import merge_json, merge_svg, read_svg, signature, local_references, validate_static_svg
from dispatch_errors import ArtifactFault


def svg(children, defs=''):
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">'
            + ('<defs>' + defs + '</defs>' if defs else '') + children + '</svg>').encode()


class MergeArtifactsTest(unittest.TestCase):
    def test_disjoint_json_growth_keeps_plan_order(self):
        base = {'groups': [{'name': 'a', 'groups': []}, {'name': 'b', 'groups': []}]}
        left, right = copy.deepcopy(base), copy.deepcopy(base)
        left['groups'][0]['groups'].append({'name': 'child', 'groups': []})
        right['groups'][1]['groups'].append({'name': 'child', 'groups': []})
        result = merge_json(base, [left, right])
        self.assertEqual([node['name'] for node in result['groups']], ['a', 'b'])
        self.assertEqual([len(node['groups']) for node in result['groups']], [1, 1])
        self.assertEqual(base['groups'][0]['groups'], [])

    def test_delete_and_foreign_edit_preserve_surviving_entries(self):
        base = [{'id': 'a', 'v': 0}, {'id': 'b', 'v': 0}]
        self.assertEqual(merge_json(base, [[base[1]], [base[0], {'id': 'b', 'v': 1}]]), [{'id': 'b', 'v': 1}])
        with self.assertRaisesRegex(ValueError, 'conflicting changes'):
            merge_json(base, [[base[1]], [{'id': 'a', 'v': 1}, base[1]]])

    def test_conflicting_values_and_order_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'conflicting changes'):
            merge_json({'value': 0}, [{'value': 1}, {'value': 2}])
        base = [{'id': 'a'}, {'id': 'b'}]
        with self.assertRaisesRegex(ValueError, '/order'):
            merge_json(base, [[base[0], {'id': 'c'}, base[1]], [base[1], base[0], {'id': 'd'}]])

    def test_disjoint_svg_edits_preserve_existing_paint_order(self):
        base = svg('<g id="a"><path fill="#111"/></g><g id="b"><path fill="#222"/></g>')
        left = base.replace(b'#111', b'#333')
        right = base.replace(b'#222', b'#444')
        merged, maps = merge_svg(base, [left, right], ['s1', 's2'])
        root = read_svg(merged)
        self.assertEqual([node.get('id') for node in root], ['a', 'b'])
        self.assertEqual(maps, [{}, {}])
        self.assertIn(b'#333', merged)
        self.assertIn(b'#444', merged)

    def test_resource_names_masks_href_events_and_descriptions_follow_renames(self):
        resources = ('<linearGradient id="shade"><stop stop-color="#abc"/></linearGradient>'
                     '<linearGradient id="linked" href="#shade"/>'
                     '<mask id="receiver"><path id="mask_path" fill="url(#linked)"/></mask>')
        drawings = []
        for name in ['a', 'b']:
            drawings.append(svg(f'<g id="{name}" mask="url(#receiver)"><path id="shadow" fill="url(#shade)">'
                                '<desc>along shadow</desc><animate begin="shadow.click"/></path>'
                                '<use href="#mask_path"/></g>', resources))
        merged, maps = merge_svg(None, drawings, ['r1s1', 'r1s2'])
        root = read_svg(merged)
        ids = {node.get('id') for node in root.iter() if node.get('id')}
        self.assertFalse(local_references(root) - ids)
        self.assertTrue(all(mapping['shadow'] in ids for mapping in maps))
        self.assertTrue(all(re.fullmatch(r'[a-z][a-z0-9]*(?:_[a-z0-9]+)*', mapping['shadow']) for mapping in maps))
        self.assertIn(b'along r1s1_shadow', merged)
        self.assertIn(b'r1s2_shadow.click', merged)
        self.assertIn(b'#abc', merged)

    def test_css_colors_remain_colors_when_id_matches_hex_color(self):
        branch = svg('<g id="abc"><style>#abc { fill: #abc; stroke: url(#shade) }</style><path/></g>',
                     '<linearGradient id="shade"/>')
        merged, maps = merge_svg(None, [branch, branch], ['s1', 's2'])
        self.assertEqual(maps[0]['abc'], 's1_abc')
        self.assertIn(b'#s1_abc { fill: #abc;', merged)
        self.assertIn(b'stroke: url(#s2_shade)', merged)

    def test_defs_added_only_in_one_branch(self):
        base = svg('<g id="a"/><g id="b"/>')
        left = svg('<g id="a"><path fill="url(#shade)"/></g><g id="b"/>', '<linearGradient id="shade"/>')
        right = svg('<g id="a"/><g id="b"><path fill="#abc"/></g>')
        merged, maps = merge_svg(base, [left, right], ['s1', 's2'])
        self.assertIn(b'url(#s1_shade)', merged)
        self.assertEqual(maps[1], {})

    def test_missing_reference_and_canvas_mismatch_reject(self):
        with self.assertRaisesRegex(ValueError, 'unresolved references'):
            merge_svg(None, [svg('<path fill="url(#missing)"/>')], ['s1'])
        base = svg('<g id="a"/>')
        with self.assertRaisesRegex(ValueError, 'canvas changed'):
            merge_svg(base, [base.replace(b'width="20"', b'width="21"')], ['s1'])

    def test_ambiguous_anonymous_children_and_same_path_edits_conflict(self):
        base = svg('<path fill="#111"/><path fill="#222"/>')
        with self.assertRaisesRegex(ValueError, 'conflicting changes'):
            merge_svg(base, [base.replace(b'#111', b'#333'), base.replace(b'#222', b'#444')], ['s1', 's2'])
        base = svg('<g id="a"><path fill="#111"/></g>')
        with self.assertRaisesRegex(ValueError, 'conflicting changes'):
            merge_svg(base, [base.replace(b'#111', b'#333'), base.replace(b'#111', b'#444')], ['s1', 's2'])

    def test_no_edit_is_semantically_identical(self):
        base = svg('<g id="a"><path d="M0 0L10 10" fill="url(#shade)"/></g>', '<linearGradient id="shade"/>')
        merged, maps = merge_svg(base, [base, base], ['s1', 's2'])
        self.assertEqual(signature(read_svg(base)), signature(read_svg(merged)))
        self.assertEqual(maps, [{}, {}])

    def test_text_spacing_and_tails_survive_independent_edits(self):
        base = svg('<g id="a"><text id="label"> Hello <tspan id="word">world</tspan> ! </text></g><g id="b"/>')
        merged, _ = merge_svg(base, [base.replace(b'world', b'friend'), base.replace(b'<g id="b"/>', b'<g id="b" fill="red"/>')], ['s1', 's2'])
        self.assertIn(b' Hello ', merged)
        self.assertIn(b'friend</tspan> ! ', merged)

    def test_static_contract_rejects_global_dynamic_and_external_content(self):
        for content, code in [('<style>.paint{fill:red}</style>', 'svg_global_style'),
                              ('<path onload="paint()"/>', 'svg_dynamic_content'),
                              ('<animate/>', 'svg_dynamic_content'),
                              ('<image href="https://example.org/a.png"/>', 'svg_external_resource'),
                              ('<path style="fill:var(--paint)"/>', 'svg_external_style')]:
            with self.subTest(code=code), self.assertRaises(ArtifactFault) as failure:
                validate_static_svg(read_svg(svg(content)))
            self.assertEqual(failure.exception.code, code)
        with self.assertRaises(ArtifactFault):
            read_svg(b'<?xml-stylesheet href="style.css"?>' + svg('<g/>'))
        validate_static_svg(read_svg(svg('<path fill="url(#paint)"/>', '<linearGradient id="paint"/>')))

    def test_rendering_metadata_references_follow_duplicate_id_renames(self):
        one = svg('<g id="shadow" data-rendering-layer="shadow"><path fill="url(#paint)"/></g>', '<linearGradient id="paint"/>')
        merged, maps = merge_svg(None, [one, one], ['s1', 's2'])
        self.assertIn(b'data-rendering-layer="s1_shadow"', merged)
        self.assertIn(b'data-rendering-layer="s2_shadow"', merged)


if __name__ == '__main__':
    unittest.main()
