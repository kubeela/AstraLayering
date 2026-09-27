from pathlib import Path
import re
from lxml import etree as ET

HERE = Path(__file__).resolve().parent.parent
src = HERE / "衣装来源.svg"
dst = HERE / "character.svg"
parser = ET.XMLParser(remove_blank_text=False, huge_tree=True)
tree = ET.parse(str(src), parser)
root = tree.getroot()
ns = {"s": "http://www.w3.org/2000/svg"}

removed_groups = [
    "bodysuit",
    "fx_hair5_right_long_on_bodysuit",
    "fx_hair5_left_long_on_bodysuit",
    "fx_body5_bodysuit_on_torso",
    "fx_lower2_bodysuit_on_pelvis",
    "fx_lower3_bodysuit_on_thigh_right",
    "fx_lower3_bodysuit_on_thigh_left",
    "fx_arms2_bodysuit_on_upper_arm_right",
    "fx_arms2_bodysuit_on_upper_arm_left",
]
removed_defs = [
    "hair5_complete_source_bodysuit",
    "hair5_surface_bodysuit",
    "body5_bodysuit_projection_source",
    "body5_bodysuit_projection",
    "body5_bodysuit_cast_color",
    "body5_cloth_below_hair_partition",
    "lower2_bodysuit_cast_shape",
    "lower2_bodysuit_cast_color",
    "arms2_bodysuit_projected_right",
    "arms2_bodysuit_projected_left",
    "arms2_right_garment_contact_color",
    "arms2_left_garment_contact_color",
]
for name in removed_groups + removed_defs:
    nodes = root.xpath("//*[@id=$name]", name=name)
    assert len(nodes) == 1, (name, len(nodes))
    nodes[0].getparent().remove(nodes[0])

# The original pelvis stopped at the bodysuit's crotch point, leaving a small
# transparent wedge between the two complete thigh roots. Continue the pelvis
# surface within that existing root gap; the thighs remain in front.
old_join = "C 458.8,772.4 452.4,765.3 445.0,765.0 C 437.6,765.0 430.9,772.0 420.8,777.0"
new_join = "C 457.0,772.0 451.0,779.0 449.0,792.0 C 446.5,806.0 445.3,820.0 445.0,835.0 C 444.7,820.0 443.5,806.0 441.0,792.0 C 439.0,779.0 433.0,772.0 420.8,777.0"
for name in ("pelvis_complete_shape", "lower2_pelvis_surface_clip"):
    node = root.xpath("//*[@id=$name]", name=name)[0]
    shape = node if node.get("d") else next(child for child in node if child.get("d"))
    old_d = shape.get("d")
    assert old_d.count(old_join) == 1, name
    shape.set("d", old_d.replace(old_join, new_join))

desc = root.find("s:desc", namespaces=ns)
assert desc is not None
desc.text = (desc.text or "") + " 本节点已移出临时bodysuit及其专属投影；衣装来源与关联记录见 refinement/groups/clothing/交接.md。"

meta = root.xpath("//s:metadata[@id='body5_effect_provenance']", namespaces=ns)[0]
meta.text = (meta.text or "").replace(
    "clothing contact follows the unchanged current garment shape and reference narrow skin-side contact; the clothed chest-to-trunk cast is a low-contrast hidden continuation inference.",
    "the former bodysuit contact is archived in refinement/groups/clothing/衣装来源.svg and removed from this body-only version; the chest-to-trunk cast remains a low-contrast hidden continuation inference.",
)

all_ids = [n.get("id") for n in root.iter() if n.get("id")]
assert len(all_ids) == len(set(all_ids)), "duplicate ids"
refs = []
for n in root.iter():
    for key, value in n.attrib.items():
        if key in ("href", "{http://www.w3.org/1999/xlink}href") and value.startswith("#"):
            refs.append((n.get("id"), value[1:]))
        refs.extend((n.get("id"), x) for x in re.findall(r"url\(#([^)]+)\)", value))
bad = [(i, x) for i, x in refs if x not in all_ids]
assert not bad, bad[:20]
assert not [n for n in root.iter() if n.get("data-source-part") == "bodysuit" or n.get("data-target-part") == "bodysuit"]
tree.write(str(dst), encoding="utf-8", xml_declaration=False)
print("removed groups:", removed_groups)
print("removed defs:", removed_defs)
print("remaining nodes", len(list(root.iter())), "refs", len(refs))
