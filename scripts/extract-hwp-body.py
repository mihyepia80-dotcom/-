#!/usr/bin/env python3
"""Extract readable text from HWP BodyText sections."""
import re
import sys
from pathlib import Path

import olefile


def decode_utf16_chunks(data: bytes) -> str:
    parts = []
    i = 0
    while i < len(data) - 1:
        # UTF-16LE Korean/ASCII run
        if data[i + 1] == 0 and (0x09 <= data[i] <= 0x7E or data[i] >= 0xA0):
            chars = []
            while i < len(data) - 1:
                lo, hi = data[i], data[i + 1]
                if hi == 0 and (0x09 <= lo <= 0x7E or lo >= 0xA0):
                    chars.append(chr(lo))
                    i += 2
                else:
                    break
            if len(chars) >= 2:
                parts.append(''.join(chars))
            continue
        # raw UTF-16LE pairs (Hangul)
        if i + 3 < len(data):
            try:
                ch = data[i : i + 2].decode('utf-16-le')
                if '\uac00' <= ch <= '\ud7a3' or ch in '\r\n\t ':
                    run = []
                    j = i
                    while j + 1 < len(data):
                        c = data[j : j + 2].decode('utf-16-le', errors='ignore')
                        if not c or (len(c) == 1 and ord(c[0]) < 0x20 and c not in '\r\n\t'):
                            break
                        if len(c) == 1 and (
                            '\uac00' <= c <= '\ud7a3'
                            or c.isalnum()
                            or c in ' ,.:;()[]<>+-/\\\'\"~!@#$%^&*_=|?'
                        ):
                            run.append(c)
                            j += 2
                        else:
                            break
                    if len(run) >= 2:
                        parts.append(''.join(run))
                        i = j
                        continue
            except Exception:
                pass
        i += 1
    return '\n'.join(parts)


def extract_hwp(path: Path) -> str:
    ole = olefile.OleFileIO(str(path))
    chunks = []
    if ole.exists('PrvText'):
        raw = ole.openstream('PrvText').read()
        for enc in ('utf-16-le', 'cp949', 'utf-8'):
            try:
                chunks.append(raw.decode(enc))
                break
            except UnicodeDecodeError:
                continue
    for s in ole.listdir():
        if s[0] == 'BodyText':
            raw = ole.openstream(s).read()
            text = decode_utf16_chunks(raw)
            if text.strip():
                chunks.append(f"\n<!-- {'/'.join(s)} -->\n{text}")
    return '\n\n'.join(chunks)


def main():
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    text = extract_hwp(src)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(f'# {src.stem}\n\n> 원본: `{src.name}`\n\n' + text.strip() + '\n', encoding='utf-8')
    print(f'wrote {dst} ({len(text)} chars)')


if __name__ == '__main__':
    main()
