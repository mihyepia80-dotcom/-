#!/usr/bin/env python3
"""Extract HWPX section XML to markdown."""
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path


def extract_hwpx(path: Path) -> str:
    parts = []
    with zipfile.ZipFile(path) as z:
        for name in sorted(z.namelist()):
            if name.startswith('Contents/section') and name.endswith('.xml'):
                root = ET.fromstring(z.read(name))
                texts = []
                for el in root.iter():
                    tag = el.tag.split('}')[-1] if '}' in el.tag else el.tag
                    if tag == 't':
                        if el.text:
                            texts.append(el.text)
                        if el.tail:
                            texts.append(el.tail)
                parts.append(''.join(texts))
    return '\n\n'.join(parts)


def main():
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    text = extract_hwpx(src)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(f'# {src.stem}\n\n> 원본: `{src.name}`\n\n' + text.strip() + '\n', encoding='utf-8')
    print(f'wrote {dst} ({len(text)} chars)')


if __name__ == '__main__':
    main()
