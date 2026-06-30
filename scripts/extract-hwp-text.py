#!/usr/bin/env python3
"""Extract text from HWP/HWPX files to markdown."""
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def extract_hwpx(path: Path) -> str:
    with zipfile.ZipFile(path) as z:
        if 'Preview/PrvText.txt' in z.namelist():
            return z.read('Preview/PrvText.txt').decode('utf-8', errors='replace')
        parts = []
        for name in sorted(z.namelist()):
            if name.startswith('Contents/section') and name.endswith('.xml'):
                root = ET.fromstring(z.read(name))
                ns = {'hp': 'http://www.hancom.co.kr/hwpml/2011/paragraph'}
                for t in root.iter():
                    if t.tag.endswith('}t') and t.text:
                        parts.append(t.text)
                    if t.tag.endswith('}t') and t.tail:
                        parts.append(t.tail)
        return '\n'.join(parts)


def extract_hwp_prv(path: Path) -> str:
    import olefile

    ole = olefile.OleFileIO(str(path))
    if ole.exists('PrvText'):
        data = ole.openstream('PrvText').read()
        for enc in ('utf-16-le', 'utf-8', 'cp949'):
            try:
                return data.decode(enc)
            except UnicodeDecodeError:
                continue
    # fallback: decode utf-16 chunks from all BodyText sections
    chunks = []
    for s in ole.listdir():
        if s[0] == 'BodyText':
            raw = ole.openstream(s).read()
            i = 0
            while i < len(raw) - 1:
                if raw[i + 1] == 0 and 0x20 <= raw[i] < 0x7F:
                    start = i
                    chars = []
                    while i < len(raw) - 1:
                        lo, hi = raw[i], raw[i + 1]
                        if hi == 0 and lo >= 0x20:
                            chars.append(chr(lo))
                            i += 2
                        elif hi != 0:
                            break
                        else:
                            break
                    if len(chars) >= 4:
                        chunks.append(''.join(chars))
                    continue
                i += 1
    return '\n'.join(chunks)


def main():
    targets = [
        (ROOT / '2026 부서별 협의록.hwp', ROOT / 'docs' / '2026-부서별-협의록.md'),
        (ROOT / '2026학년도 1학기 학교중간평가 협의록(합치기).hwpx', ROOT / 'docs' / '2026-학년별-중간평가-협의록.md'),
    ]
    for src, dst in targets:
        if not src.exists():
            print(f'missing: {src}', file=sys.stderr)
            continue
        if src.suffix.lower() == '.hwpx':
            text = extract_hwpx(src)
        else:
            text = extract_hwp_prv(src)
        dst.parent.mkdir(parents=True, exist_ok=True)
        header = f'# {src.stem}\n\n> 원본: `{src.name}`\n\n'
        dst.write_text(header + text.strip() + '\n', encoding='utf-8')
        print(f'wrote {dst} ({len(text)} chars)')


if __name__ == '__main__':
    main()
