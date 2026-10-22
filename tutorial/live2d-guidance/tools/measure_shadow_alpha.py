"""Read original PSD pixels and measure shadow/receiver alpha coverage; never modify art."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image
from psd_tools import PSDImage


def measure(path, layer_id, receiver_ids):
    psd = PSDImage.open(path)
    layers = {layer.layer_id: layer for layer in psd.descendants()}
    shadow = layers[layer_id]
    image = shadow.topil().convert('RGBA')
    alpha = np.array(image.getchannel('A'))
    union = np.zeros_like(alpha, dtype=bool)
    receivers = []
    for receiver_id in receiver_ids:
        receiver = layers[receiver_id]
        coverage = Image.new('L', image.size)
        coverage.paste(receiver.topil().getchannel('A'),
                       (receiver.left - shadow.left, receiver.top - shadow.top))
        union |= np.array(coverage) > 0
        receivers.append({'id': receiver_id, 'name': receiver.name, 'bounds': list(receiver.bbox)})
    raw = int((alpha > 0).sum())
    intersection = int(((alpha > 0) & union).sum())
    return {
        'file': Path(path).name, 'sha256': hashlib.sha256(Path(path).read_bytes()).hexdigest(),
        'width': psd.width, 'height': psd.height, 'layerId': layer_id, 'layerName': shadow.name,
        'bounds': list(shadow.bbox), 'clipping': shadow.clipping,
        'blendMode': shadow.blend_mode.name.lower(), 'opacityByte': shadow.opacity,
        'rawAlphaPixels': raw, 'receivers': receivers,
        'receiverAlphaUnionIntersectionPixels': intersection,
        'rawToIntersectionRatio': round(raw / intersection, 3) if intersection else None,
        'definition': 'Original raster alpha > 0; receiver union at PSD coordinates. '
                      'Excludes other occluders, final blending and Cubism deformation.',
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('psd', type=Path)
    parser.add_argument('--layer', type=int, required=True)
    parser.add_argument('--receiver', type=int, action='append', default=[])
    args = parser.parse_args()
    print(json.dumps(measure(args.psd, args.layer, args.receiver), ensure_ascii=False, indent=2))
