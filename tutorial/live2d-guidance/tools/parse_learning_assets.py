"""Extract non-pixel research metadata with Python's standard library only.

PSD v1 layer-record parser, based on Adobe's published file format specification.
Does not decode pixels, execute source files, or recreate a model.
"""
import argparse
import collections
import hashlib
import json
import struct
from pathlib import Path

SPEC = 'https://www.adobe.com/devnet-apps/photoshop/fileformatashtml/'


class Reader:
    def __init__(self, data):
        self.data, self.p = data, 0

    def take(self, n):
        if n < 0 or self.p + n > len(self.data):
            raise ValueError(f'Unexpected end at {self.p}, requested {n}')
        value = self.data[self.p:self.p+n]
        self.p += n
        return value

    def num(self, fmt):
        return struct.unpack('>' + fmt, self.take(struct.calcsize('>' + fmt)))[0]

    def block(self):
        return self.take(self.num('I'))


def digest(data):
    return hashlib.sha256(data).hexdigest()


def psd_metadata(path):
    data = path.read_bytes()
    r = Reader(data)
    if r.take(4) != b'8BPS' or r.num('H') != 1:
        raise ValueError('Only PSD version 1 is supported')
    if r.take(6) != bytes(6):
        raise ValueError('Invalid reserved bytes')
    channels, height, width, depth, mode = [r.num(f) for f in ['H', 'I', 'I', 'H', 'H']]
    r.block()  # color data
    resources = Reader(r.block())
    resolution = None
    while resources.p < len(resources.data):
        if resources.take(4) != b'8BIM':
            raise ValueError('Invalid image resource signature')
        resource_id = resources.num('H')
        n = resources.num('B')
        resources.take(n)
        if (n + 1) % 2:
            resources.take(1)
        blob = resources.block()
        if len(blob) % 2:
            resources.take(1)
        if resource_id == 1005 and len(blob) >= 16:
            hr, hu, wu, vr, vu, heu = struct.unpack('>IHHIHH', blob[:16])
            resolution = dict(horizontalDpi=hr/65536, verticalDpi=vr/65536,
                              horizontalResolutionUnit=hu, verticalResolutionUnit=vu,
                              widthDisplayUnit=wu, heightDisplayUnit=heu)
    lm = Reader(r.block())
    info = Reader(lm.block())
    signed_count = info.num('h')
    records = []
    asset_hash = digest(data)
    for i in range(abs(signed_count)):
        top, left, bottom, right = [info.num('i') for _ in range(4)]
        ch = [dict(id=info.num('h'), encodedBytes=info.num('I')) for _ in range(info.num('H'))]
        if info.take(4) != b'8BIM':
            raise ValueError('Invalid blend signature')
        blend = info.take(4).decode('ascii')
        opacity, clipping, flags, filler = [info.num('B') for _ in range(4)]
        extra = Reader(info.block())
        mask_bytes = len(extra.block())
        ranges_bytes = len(extra.block())
        n = extra.num('B')
        legacy = extra.take(n)
        extra.take((-(n+1)) % 4)
        name = legacy.decode('mac_roman')
        name_source = 'pascal/mac_roman fallback'
        divider, layer_id, group_blend = None, None, None
        additional = []
        while extra.p + 12 <= len(extra.data):
            signature = extra.take(4)
            if signature not in (b'8BIM', b'8B64'):
                if signature == bytes(4):
                    extra.p = len(extra.data)
                    break
                raise ValueError(f'Unexpected additional signature {signature!r}')
            key = extra.take(4).decode('ascii')
            blob = extra.block()
            if len(blob) % 2:
                extra.take(1)
            additional.append(dict(key=key, bytes=len(blob)))
            if key == 'luni':
                nr = Reader(blob)
                name = nr.take(nr.num('I') * 2).decode('utf-16-be').rstrip('\x00')
                name_source = 'luni/utf-16-be'
            elif key == 'lyid':
                layer_id = struct.unpack('>I', blob[:4])[0]
            elif key in ('lsct', 'lsdk'):
                divider = struct.unpack('>I', blob[:4])[0]
                if len(blob) >= 12 and blob[4:8] == b'8BIM':
                    group_blend = blob[8:12].decode('ascii')
        if extra.p != len(extra.data):
            # Up to three bytes of record padding are permitted.
            trailing = extra.take(len(extra.data)-extra.p)
            if any(trailing) or len(trailing) > 3:
                raise ValueError('Unparsed layer extra data tail')
        records.append(dict(recordIndex=i, id=f'psd-{asset_hash[:16]}-record-{i:03d}',
                            originalName=name, nameEncoding=name_source, psdLayerId=layer_id,
                            bounds=dict(top=top, left=left, bottom=bottom, right=right),
                            width=right-left, height=bottom-top,
                            visible=not bool(flags & 2), opacityByte=opacity,
                            opacity=opacity/255, blendKey=blend, clipping=bool(clipping),
                            rawClipping=clipping, rawFlags=flags,
                            sectionDividerType=divider, groupBlendKey=group_blend,
                            channels=ch, maskDataBytes=mask_bytes, blendingRangesBytes=ranges_bytes,
                            additionalBlocks=additional, children=[], parentId=None))
    channel_bytes = sum(c['encodedBytes'] for n in records for c in n['channels'])
    info.take(channel_bytes)
    tail = info.take(len(info.data)-info.p)
    if len(tail) > 3 or any(tail):
        raise ValueError('Layer records and channel sizes did not consume layer-info section')

    def hierarchy(order):
        roots, stack = [], []
        for node in order:
            t = node['sectionDividerType']
            if t == 3:
                if not stack:
                    raise ValueError('Unmatched group closing divider')
                node['parentId'] = stack[-1]['id']
                node['kind'] = 'groupEndMarker'
                stack[-1]['closingRecordId'] = node['id']
                stack.pop()
                continue
            node['kind'] = 'group' if t in (1, 2) else 'layer'
            node['parentId'] = stack[-1]['id'] if stack else None
            (stack[-1]['children'] if stack else roots).append(node['id'])
            if t in (1, 2):
                node['groupOpenInEditor'] = t == 1
                stack.append(node)
        if stack:
            raise ValueError('Unclosed PSD groups')
        return roots

    # Structural validity chooses order, not filename or guessed semantic labels.
    try:
        roots = hierarchy(records)
        order = 'file record order'
    except ValueError:
        for node in records:
            node['children'], node['parentId'] = [], None
            node.pop('closingRecordId', None)
        roots = hierarchy(list(reversed(records)))
        order = 'reverse file record order'
    nodes = {n['id']: n for n in records}
    def visit(key, parent_visible=True):
        node = nodes[key]
        node['effectiveVisible'] = parent_visible and node['visible']
        for child in node['children']:
            visit(child, node['effectiveVisible'])
    for root in roots:
        visit(root)
    counts = dict(collections.Counter(n['kind'] for n in records))
    return dict(schemaVersion=1, asset=dict(fileName=path.name, bytes=len(data), sha256=asset_hash,
                source='https://www.bilibili.com/video/BV16o4y187yV', author='卡米雷特',
                localAssetRelativePath='local-assets/milly/'+path.name,
                redistribution='Original package forbids redistribution; no pixels included'),
                document=dict(format='PSD', version=1, width=width, height=height,
                              channels=channels, bitsPerChannel=depth, colorMode=mode,
                              resolution=resolution, mergedTransparency=signed_count < 0),
                recordCount=len(records), counts=counts, hierarchyOrder=order,
                rootIds=roots, records=records,
                validation=dict(balancedGroupDividers=True, allChannelLengthsConsumed=True,
                                allNamesUnicode=all(n['nameEncoding'].startswith('luni') for n in records)),
                notParsed=['pixel data', 'mask contents and geometry', 'layer effects',
                           'vector paths', 'text contents', 'adjustment descriptors',
                           'fill opacity', 'clipping-chain rendering', 'composited appearance'],
                interpretationLimits=['Bounds are PSD stored rectangles, not visible-alpha bounds',
                    'Record indices are stable for this exact SHA-256; edits may change identity',
                    'Effective visibility includes ancestors but not opacity, masks or clipping',
                    'Layer names are source labels, not independently validated anatomical semantics'],
                parserSpecification=SPEC)


def runtime_metadata(root):
    files = sorted(root.rglob('*'))
    resources = [dict(path=p.relative_to(root).as_posix(), bytes=p.stat().st_size,
                      sha256=digest(p.read_bytes()), role=p.suffix.lstrip('.')) for p in files if p.is_file()]
    model_path = next(root.glob('*.model3.json'))
    model = json.loads(model_path.read_text(encoding='utf-8-sig'))
    cdi_path = root / model['FileReferences']['DisplayInfo']
    cdi = json.loads(cdi_path.read_text(encoding='utf-8-sig'))
    phys_path = root / model['FileReferences']['Physics']
    phys = json.loads(phys_path.read_text(encoding='utf-8-sig'))
    refs = []
    for kind, value in model['FileReferences'].items():
        for item in value if isinstance(value, list) else [value]:
            name = item if isinstance(item, str) else item.get('File')
            refs.append(dict(role=kind, path=name, exists=(root/name).is_file()))
    settings = []
    for setting in phys.get('PhysicsSettings', []):
        settings.append(dict(id=setting.get('Id'), inputLinks=[dict(sourceId=x.get('Source',{}).get('Id'),
             sourceTarget=x.get('Source',{}).get('Target'),type=x.get('Type'),weight=x.get('Weight'),
             reflect=x.get('Reflect')) for x in setting.get('Input',[])],
             outputLinks=[dict(destinationId=x.get('Destination',{}).get('Id'),
                 destinationTarget=x.get('Destination',{}).get('Target'),type=x.get('Type'),
                 weight=x.get('Weight'),reflect=x.get('Reflect')) for x in setting.get('Output',[])],
             particleCount=len(setting.get('Vertices',[]))))
    parameters = [dict(id=x.get('Id'),name=x.get('Name'),groupId=x.get('GroupId')) for x in cdi.get('Parameters',[])]
    return dict(schemaVersion=1,asset=dict(name='修女莉尔免费版',source=None,author=None,license='unknown',
              localAssetRelativePath='local-assets/lier'),
              resources=resources,modelVersion=model.get('Version'),resourceReferences=refs,
              controlGroups=[dict(name=g.get('Name'),target=g.get('Target'),ids=g.get('Ids',[])) for g in model.get('Groups',[])],
              displayParameters=parameters,
              displayGroups=[dict(id=x.get('Id'),name=x.get('Name'),parentGroupId=x.get('GroupId')) for x in cdi.get('ParameterGroups',[])],
              displayParts=[dict(id=x.get('Id'),name=x.get('Name')) for x in cdi.get('Parts',[])],
              physicsLinkIndex=settings,
              counts=dict(parameters=len(parameters),physicsSettings=len(settings),resources=len(resources)),
              notParsed=['moc3 binary', 'texture pixels', 'vtube configuration semantics', 'xyplugin semantics'],
              interpretationLimits=['Display labels are not drawing-layer hierarchy',
              'No PSD or cmo3 provided; no drawing layers inferred',
              'Parameter ranges/defaults are not present in CDI; not guessed',
              'Original configuration files remain local; this is a selective relationship index'])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--psd', type=Path, required=True)
    ap.add_argument('--runtime', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    result = psd_metadata(args.psd)
    runtime = runtime_metadata(args.runtime)
    for name, data in [('milly-psd-structure.json',result),('lier-runtime-index.json',runtime)]:
        (args.out/name).write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(psdCounts=result['counts'],psdRecords=result['recordCount'],
                         hierarchyOrder=result['hierarchyOrder'],runtimeCounts=runtime['counts']),ensure_ascii=False))


if __name__ == '__main__':
    main()
