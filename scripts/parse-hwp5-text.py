#!/usr/bin/env python3
"""Extract paragraph text from HWP5 BodyText sections."""
import struct
import sys
import zlib
from pathlib import Path

import olefile

TAG_PARA_TEXT = 0x43


def decompress_section(data: bytes) -> bytes:
    try:
        return zlib.decompress(data, -15)
    except Exception:
        return data


def extract_section_text(data: bytes) -> list[str]:
    data = decompress_section(data)
    texts = []
    pos = 0
    while pos + 4 <= len(data):
        hdr = struct.unpack_from('<I', data, pos)[0]
        tag_id = hdr & 0x3FF
        size = (hdr >> 20) & 0xFFF
        pos += 4
        if size == 0xFFF:
            if pos + 4 > len(data):
                break
            size = struct.unpack_from('<I', data, pos)[0]
            pos += 4
        payload = data[pos : pos + size]
        pos += size
        if tag_id != TAG_PARA_TEXT or len(payload) <= 4:
            continue
        raw = payload[4:]
        chars = []
        i = 0
        while i < len(raw) - 1:
            if raw[i : i + 2] == b'\x00\x00':
                break
            ch = raw[i : i + 2].decode('utf-16-le', errors='ignore')
            if len(ch) == 1 and ord(ch[0]) >= 0x20:
                chars.append(ch)
            i += 2
        text = ''.join(chars).strip()
        if text:
            texts.append(text)
    return texts


def extract_hwp(path: Path) -> str:
    ole = olefile.OleFileIO(str(path))
    parts = []
    if ole.exists('PrvText'):
        parts.append(ole.openstream('PrvText').read().decode('utf-16-le', errors='replace'))
    for s in ole.listdir():
        if s[0] != 'BodyText':
            continue
        texts = extract_section_text(ole.openstream(s).read())
        if texts:
            parts.append(f"## {'/'.join(s)}\n\n" + '\n'.join(texts))
    return '\n\n'.join(parts)


def main():
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    text = extract_hwp(src)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(f'# {src.stem}\n\n> 원본: `{src.name}`\n\n' + text.strip() + '\n', encoding='utf-8')
    print(f'wrote {dst} ({len(text)} chars)')


if __name__ == '__main__':
    main()
