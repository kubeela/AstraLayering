"""Exercise actual SVG masking, original geometry and registry relations."""
import copy
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET

from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import rendering as R
from svg_preview import render_svg, read_svg, local_tag


class RenderingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='astra-rendering-')
        self.path = Path(self.temp.name)
        self.groups = self.path/'groups.json'; self.registry = self.path/'rendering.json'
        self.svg = self.path/'character.svg'; self.out = self.path/'bound.svg'
        self.tree = {'subject':'character','groups':[
            {'name':'hair','groups':[], 'parts':[{'name':'strand'}]},
            {'name':'body','groups':[], 'parts':[{'name':'torso'},{'name':'arm'}]}]}
        self.layer = {'id':'hair_shadow','type':'shadow','owner':'hair/strand',
                      'follow':'hair/strand','clip_to':['body/torso','body/arm']}
        R.write_json(self.groups, self.tree); R.write_json(self.registry, {'layers':[self.layer]})
        self.receiver = ('<g id="torso" data-part-path="body/torso"><path fill="blue" '
                         'fill-rule="evenodd" d="M10 10H40V50H10Z M20 20H30V30H20Z"/></g>'
                         '<g id="arm" data-part-path="body/arm"><rect x="45" y="10" '
                         'width="10" height="40" fill="green"/></g>')
        self.shadow = '<g id="hair_shadow"><rect width="60" height="60" fill="red"/></g>'
        self.write(self.receiver+self.shadow)

    def tearDown(self): self.temp.cleanup()

    def write(self, content, view=''):
        self.svg.write_text('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60" '+view+'>'
                            +content+'</svg>', encoding='utf-8')

    def image(self, path):
        return Image.open(io.BytesIO(render_svg(path.read_bytes()))).convert('RGBA')

    def apply(self):
        before = [p.read_bytes() for p in (self.groups,self.registry,self.svg)]
        result = R.apply(self.groups,self.registry,self.svg,self.out)
        self.assertEqual(before,[p.read_bytes() for p in (self.groups,self.registry,self.svg)])
        R.check(self.groups,self.registry,self.out,True)
        return result

    def test_group_mirror_pairs_are_metadata_for_rendering(self):
        tree = copy.deepcopy(self.tree)
        tree["mirror_pairs"] = [{"name": "paired_groups",
                            "members": ["hair", "body"]}]
        self.assertEqual(R.tree_index(tree), R.tree_index(self.tree))
        tree["mirror_pairs"][0]["members"][1] = "body/torso"
        with self.assertRaises(ValueError):
            R.tree_index(tree)

    def test_union_holes_and_blue_receiver_alpha(self):
        self.apply(); image=self.image(self.out)
        self.assertEqual(image.getpixel((15,15)),(255,0,0,255))
        self.assertEqual(image.getpixel((50,15)),(255,0,0,255))
        self.assertEqual(image.getpixel((25,25))[3],0)
        self.assertEqual(image.getpixel((42,15))[3],0)
        self.assertEqual(image.getpixel((5,5))[3],0)

    def test_rebind_is_idempotent_and_source_preserved(self):
        self.apply(); again=self.path/'again.svg'
        R.apply(self.groups,self.registry,self.out,again)
        self.assertEqual(self.image(self.out).tobytes(),self.image(again).tobytes())
        root,_=read_svg(again)
        self.assertEqual(sum(n.get(R.MANAGED)=='wrapper' for n in root.iter()),1)
        self.assertEqual(R.component(root,'hair_shadow')[0].get('width'),'60')

    def test_raw_extraction_keeps_source_and_original_soft_mask(self):
        self.write('<defs><mask id="soft" mask-type="alpha"><rect width="60" height="60" '
                   'fill="white" opacity=".5"/></mask></defs>'+self.receiver+
                   self.shadow.replace('id="hair_shadow"','id="hair_shadow" mask="url(#soft)"'))
        self.apply(); raw=self.path/'raw.svg'; R.extract(self.out,'hair_shadow',raw,True)
        clipped=self.path/'clipped.svg'; R.extract(self.out,'hair_shadow',clipped)
        self.assertIn(self.image(raw).getpixel((5,5))[3],(127,128))
        self.assertEqual(self.image(clipped).getpixel((5,5))[3],0)
        self.assertIn(self.image(clipped).getpixel((15,15))[3],(127,128))

    def test_ancestor_translate_rotate_and_scale(self):
        fixtures=['translate(10 5)','scale(2 .5)','rotate(15 20 20)',
                  'matrix(1 .1 .2 1 0 0)','translate(10 5) rotate(15) scale(2 .5)']
        for value in fixtures:
            with self.subTest(value=value):
                self.write(self.receiver+'<g transform="'+value+'">'+
                           '<g id="hair_shadow"><rect x="-100" y="-100" width="300" '
                           'height="300" fill="red"/></g></g>')
                self.apply(); image=self.image(self.out)
                self.assertEqual(image.getpixel((15,15)),(255,0,0,255))
                self.assertEqual(image.getpixel((25,25))[3],0)
                self.assertEqual(image.getpixel((5,5))[3],0)

    def test_nonzero_scaled_viewbox(self):
        self.write(self.receiver+self.shadow,'viewBox="10 0 40 30"')
        self.apply(); image=self.image(self.out)
        self.assertEqual(image.getpixel((10,30)),(255,0,0,255))
        self.assertEqual(image.getpixel((30,50))[3],0)

    def test_root_transform_is_not_applied_twice_to_receiver(self):
        self.write(self.receiver+self.shadow,'transform="translate(5 0)"')
        self.apply(); image=self.image(self.out)
        self.assertEqual(image.getpixel((17,15)),(255,0,0,255))
        self.assertEqual(image.getpixel((30,25))[3],0)

    def test_receiver_transforms_and_resource_ids_survive(self):
        self.write('<defs><linearGradient id="blue"><stop stop-color="blue"/></linearGradient></defs>'
                   '<g transform="translate(5 0)">'+self.receiver.replace('fill="blue"',
                   'fill="url(#blue)"')+'</g>'+self.shadow)
        self.apply(); image=self.image(self.out)
        self.assertEqual(image.getpixel((17,15)),(255,0,0,255))
        self.assertEqual(image.getpixel((30,25))[3],0)

    def test_group_receiver_and_css_stays_scoped(self):
        self.layer['clip_to']=['body']; R.write_json(self.registry,{'layers':[self.layer]})
        self.write('<style>.part {fill:blue} rect {fill:red}</style>'+self.receiver+self.shadow)
        self.apply()
        self.assertEqual(self.image(self.out).getpixel((15,15)),(255,0,0,255))
        self.assertEqual(self.image(self.out).getpixel((5,5))[3],0)

    def test_missing_receiver_and_changed_registry_rejected(self):
        self.apply(); self.layer['clip_to']=['body/torso']
        R.write_json(self.registry,{'layers':[self.layer]})
        with self.assertRaisesRegex(ValueError,'reapply'):
            R.check(self.groups,self.registry,self.out,True)
        self.write(self.shadow)
        with self.assertRaisesRegex(ValueError,'Missing receiver'):
            R.apply(self.groups,self.registry,self.svg,self.out)

    def test_registry_relations_not_physical_nodes_and_scope_preserves_others(self):
        index=R.tree_index(self.tree)
        for field,value in [('owner','missing'),('follow','missing'),('clip_to',['missing'])]:
            layer=dict(self.layer);layer[field]=value
            with self.assertRaises(ValueError): R.validate({'layers':[layer]},index)
        patch=self.path/'patch.json'; edited=dict(self.layer);edited['note']='updated'
        R.write_json(patch,{'layers':[edited]})
        R.merge(self.groups,self.registry,patch,self.registry,'hair')
        with self.assertRaisesRegex(ValueError,'another group'):
            R.merge(self.groups,self.registry,patch,self.registry,'body')
        self.assertEqual(R.load(self.groups),self.tree)

    def test_no_effects_and_unclipped_generic_effects(self):
        R.write_json(self.registry,{'layers':[]}); self.apply()
        self.layer.update(type='glow',follow=None,clip_to=[])
        R.write_json(self.registry,{'layers':[self.layer]});self.apply()
        self.assertEqual(self.image(self.out).getpixel((5,5)),(255,0,0,255))

    def test_empty_placeholder_and_physical_binding_rejected(self):
        for shadow in ('<g id="hair_shadow"/>', self.shadow.replace('id="hair_shadow"',
                      'id="hair_shadow" data-part-path="hair/strand"')):
            with self.subTest(shadow=shadow):
                self.write(self.receiver+shadow)
                with self.assertRaises(ValueError):
                    R.check(self.groups,self.registry,self.svg)


if __name__=='__main__': unittest.main()
