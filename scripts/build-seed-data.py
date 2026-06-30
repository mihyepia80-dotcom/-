#!/usr/bin/env python3
"""한글 협의록 → MD + js/seed-data.js 생성"""
from __future__ import annotations

import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
OUT_JS = ROOT / 'js' / 'seed-data.js'

MONTHS = ['3월', '4월', '5월', '6월', '7월']
DEPT_MAP = {
    '1. 교무기획부': 'gyomu',
    '2. 생활인성교육부': 'saenghwal',
    '2. 생활인성부': 'saenghwal',
    '3. 진로안전부': 'jiro',
    '4. 늘봄학교': 'neulbom',
    '5. 연구기획부': 'yeongu',
    '6. 문화예술체육교육부': 'munhwa',
    '6. 문화예술체육부': 'munhwa',
    '7. 과학정보부': 'gwahak',
    '8. 6학년부': 'grade6',
}


def extract_hwpx_text(path: Path) -> str:
    with zipfile.ZipFile(path) as z:
        parts = []
        for name in sorted(z.namelist()):
            if name.startswith('Contents/section') and name.endswith('.xml'):
                root = ET.fromstring(z.read(name))
                texts = []
                for el in root.iter():
                    tag = el.tag.split('}')[-1]
                    if tag == 't':
                        if el.text:
                            texts.append(el.text)
                        if el.tail:
                            texts.append(el.tail)
                parts.append(''.join(texts))
        return '\n'.join(parts)


def extract_hwp_sections(path: Path) -> dict[str, str]:
    import olefile
    import struct
    import zlib

    TAG_PARA_TEXT = 0x43

    def decompress(data: bytes) -> bytes:
        try:
            return zlib.decompress(data, -15)
        except Exception:
            return data

    def section_text(data: bytes) -> str:
        data = decompress(data)
        lines = []
        pos = 0
        while pos + 4 <= len(data):
            hdr = struct.unpack_from('<I', data, pos)[0]
            tag_id = hdr & 0x3FF
            size = (hdr >> 20) & 0xFFF
            pos += 4
            if size == 0xFFF:
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
            t = ''.join(chars).strip()
            if t:
                lines.append(t)
        return '\n'.join(lines)

    ole = olefile.OleFileIO(str(path))
    sections = {}
    for s in ole.listdir():
        if s[0] != 'BodyText':
            continue
        sections['/'.join(s)] = section_text(ole.openstream(s).read())
    return sections


def parse_grade_opinions(text: str) -> dict[int, str]:
    opinions = {}
    for m in re.finditer(r'\((\d)학년\)([\s\S]*?)(?=\(\d학년\)|$)', text):
        grade = int(m.group(1))
        opinion = m.group(2).strip()
        if opinion:
            opinions[grade] = opinion.strip()
    return opinions


def parse_events(raw: str) -> list[dict]:
    raw = re.sub(r'\(※[^)]+\)', '', raw)
    raw = raw.replace('(전학년)', '')
    raw = re.sub(r'순월대상학년\(참여시간\)교육활동\(행사명\)부서\(담당\).*?만족도', '', raw)
    raw = re.sub(r'\(\d학년\) ~~~.*?삭제\)', '', raw)

    split_m = re.search(r'교사,\s*학부모\s*및\s*기타\s*운영|협의록교사,\s*학부모', raw)
    part1 = raw[: split_m.start()] if split_m else raw
    part2 = raw[split_m.end() :] if split_m else ''

    dept_names = (
        '늘봄학교|교무부장|교무부|연구부장|연구부|문예체부|문예체|과학부장|과학정보부|'
        '생활인성부장|생활인성|진로부장|진로부|보건|특수교육|기초학력|영양|상담|교과'
    )

    def parse_chunk(chunk: str, section: str) -> list[dict]:
        chunk = re.sub(r'학년\s*행사\s*등', '', chunk)
        parts = re.split(r'(?=\d+(?:3월|4월|5월|6월|7월|1학기|연중))', chunk)
        out = []
        for part in parts:
            m = re.match(r'^(\d+)(3월|4월|5월|6월|7월|1학기|연중)([\s\S]+)$', part.strip())
            if not m:
                continue
            seq, month, body = int(m.group(1)), m.group(2), m.group(3)
            if seq > 60 or len(body) < 4:
                continue

            grade_m = re.match(r'^(\d+(?:~\d+)?(?:,\d+)?(?:G|학년)[^가-힣\(]*)', body)
            grade = grade_m.group(1).strip() if grade_m else ''
            rest = body[grade_m.end() :] if grade_m else body

            dept_m = re.search(rf'({dept_names})', rest)
            if dept_m:
                activity = rest[: dept_m.start()].strip()
                dept = dept_m.group(1)
                tail = rest[dept_m.end() :]
            else:
                activity = rest[:60].strip()
                dept = ''
                tail = rest

            person_m = re.match(r'^\(([^)]*)\)', tail)
            person = person_m.group(1).strip() if person_m else ''
            tail = tail[person_m.end() :] if person_m else tail
            opinions = parse_grade_opinions(tail)
            result = re.split(r'\(\d학년\)', tail)[0].strip()
            result = re.sub(r'^[▪\-■●\s]+', '', result)

            if not activity and not dept:
                continue

            out.append(
                {
                    'seq': seq,
                    'section': section,
                    'month': month,
                    'grade': grade or '1~6G',
                    'activity': activity,
                    'dept': dept or person,
                    'person': person,
                    'result': result,
                    'opinions': opinions,
                }
            )
        return out

    events = parse_chunk(part1, '학년 행사') + parse_chunk(part2, '교사·학부모·기타')
    return events


def event_to_master_row(ev: dict, idx: int) -> dict:
    semester = '2학기' if ev['month'] in ('8월', '9월', '10월', '11월', '12월', '1월') else '1학기'
    good = ev.get('result', '')
    improve = ''
    opinion_lines = []
    for g, op in sorted(ev.get('opinions', {}).items()):
        opinion_lines.append(f'({g}학년) {op}')
    if opinion_lines:
        good = (good + '\n' + '\n'.join(opinion_lines)).strip() if good else '\n'.join(opinion_lines)
    return {
        'id': f'seed-master-{idx}',
        'semester': semester,
        'month': ev['month'] if ev['month'] in MONTHS else ('3월' if ev['month'] == '1학기' else '6월'),
        'grade': ev['grade'],
        'activity': ev['activity'],
        'dept': ev['dept'] or ev['person'],
        'goodPoints': good,
        'improvePoints': improve,
    }


def build_grade_seed(events: list[dict]) -> dict:
    grade_data = {f'fg{n}': {'mainRows': [], 'attachRows': []} for n in range(1, 7)}

    for ev in events:
        if ev['section'] != '학년 행사':
            continue
        month = ev['month'] if ev['month'] in MONTHS else '3월'
        for g, opinion in ev.get('opinions', {}).items():
            if g < 1 or g > 6:
                continue
            prefix = f'fg{g}'
            sat = ''
            sat_m = re.search(r'\((\d)\)\s*$', opinion)
            if sat_m:
                sat = sat_m.group(1)
                opinion = opinion[: sat_m.start()].strip()
            grade_data[prefix]['mainRows'].append(
                {
                    'month': month,
                    'grade': ev['grade'],
                    'content': ev['activity'],
                    'satisfaction': sat,
                    'goodPoints': opinion,
                    'improvePoints': '',
                }
            )

    attach_events = [ev for ev in events if ev['section'] != '학년 행사']
    for g in range(1, 7):
        prefix = f'fg{g}'
        rows = []
        for ev in attach_events:
            op = ev.get('opinions', {}).get(g, '')
            if not op:
                continue
            sat = ''
            sat_m = re.search(r'\((\d)\)\s*$', op)
            if sat_m:
                sat = sat_m.group(1)
                op = op[: sat_m.start()].strip()
            rows.append(
                {
                    'content': f"{ev['month']} {ev['activity']} ({ev['dept']})",
                    'goodPoints': op,
                    'improvePoints': '',
                    'satisfaction': sat,
                }
            )
        grade_data[prefix]['attachRows'] = rows[:8] or grade_data[prefix]['attachRows']
    return grade_data


def detect_dept(section_text: str) -> str | None:
    m = re.search(r'부서별 협의록\s*\(\s*([^)]+)\)', section_text)
    if not m:
        return None
    label = m.group(1).strip()
    return DEPT_MAP.get(label)


def parse_dept_section(section_text: str) -> list[dict]:
    m = re.search(r'업무추진결과[\s\S]{0,30}?2학기\s*계획', section_text)
    if not m:
        return []
    body = section_text[m.end() :]
    body = re.split(r'담\s*당\s*자\s*별\s*업\s*무\s*내\s*용|서\s*별\s*업\s*무\s*내\s*용', body)[0]
    lines = [ln.strip() for ln in body.splitlines() if ln.strip() and ln.strip() not in ('협의', '2학기 계획')]
    entries = []
    current = None
    for ln in lines:
        if re.match(r'^[\d\[\(<]', ln) or '부서별 협의록' in ln:
            continue
        if len(ln) <= 24 and not ln.startswith(('-', '■', '▪', '●')) and '학기]' not in ln:
            if current and current.get('content'):
                entries.append(current)
            if valid_title(ln):
                current = {'title': ln, 'content': ''}
            elif current is None:
                current = {'title': '업무', 'content': ln}
            else:
                current['content'] += ('\n' if current['content'] else '') + ln
        elif current is not None:
            current['content'] += ('\n' if current['content'] else '') + ln
        elif len(ln) > 24:
            current = {'title': '업무', 'content': ln}
    if current and current.get('content'):
        entries.append(current)
    return entries


def valid_title(title: str) -> bool:
    t = title.strip()
    if len(t) < 3:
        return False
    if t.endswith(']') or t.startswith('['):
        return False
    if re.match(r'^[\W\d\.]+$', t):
        return False
    return True


def parse_satisfaction(text: str) -> tuple[str, str]:
    m = re.search(r'\((\d)\)\s*$', text.strip())
    if m:
        return m.group(1), text[: m.start()].strip()
    return '', text.strip()


def extract_curriculum_note(text: str) -> str:
    m = re.search(r'\(교과(?: 및 비교과|,\s*비교과)?[^)]*\)\s*(.*)$', text, re.S)
    if m and m.group(1).strip():
        return m.group(1).strip()
    if '(교과 및 비교과)' in text or '(교과,비교과)' in text:
        return re.sub(r'\(교과[^)]*\)', '', text).strip()
    return ''


def build_form4_seed(events: list[dict]) -> dict:
    gyogwa_main = []
    gyogwa_attach = []
    bigyo_attach = []

    for ev in events:
        blob = f"{ev.get('activity', '')} {ev.get('dept', '')} {ev.get('result', '')}"
        is_gyogwa = ev.get('dept') == '교과' or '교과총량' in blob or '교과전담' in blob

        if is_gyogwa and ev.get('section') != '학년 행사':
            reason_lines = []
            for g, op in sorted(ev.get('opinions', {}).items()):
                if 1 <= g <= 6:
                    _, note = parse_satisfaction(op)
                    if note:
                        reason_lines.append(f'({g}학년) {note}')
            gyogwa_main.append(
                {
                    'category': '본인' if not gyogwa_main else ('주관' if len(gyogwa_main) == 1 else '업무'),
                    'target': ev.get('grade', '3~6학년'),
                    'program': f"{ev.get('activity', '').strip()} {ev.get('result', '').strip()}".strip(),
                    'satisfaction': '',
                    'reason': '\n'.join(reason_lines) or ev.get('result', ''),
                }
            )
            gyogwa_attach.append(
                {
                    'content': f"{ev['month']} {ev['activity']} ({ev['dept']})",
                    'evaluation': '\n'.join(reason_lines),
                }
            )

        for g, op in sorted(ev.get('opinions', {}).items()):
            if g < 1 or g > 6:
                continue
            note = extract_curriculum_note(op)
            if not note and ('(교과 및 비교과)' in op or '(교과,비교과)' in op):
                note = extract_curriculum_note(op) or re.sub(r'\(\d학년\)', '', op).strip()
            if note:
                bigyo_attach.append(
                    {
                        'content': f"{ev['month']} {ev['activity']} ({ev['dept']}) · {g}학년",
                        'evaluation': note,
                    }
                )

    default_main = [
        {'category': c, 'target': '', 'program': '', 'satisfaction': '', 'reason': ''}
        for c in ['본인', '주관', '행사', '업무']
    ]
    while len(gyogwa_main) < 4:
        gyogwa_main.append({**default_main[len(gyogwa_main)]})

    pad_attach = lambda rows, n: rows[:n] if rows else [{'content': '', 'evaluation': ''} for _ in range(3)]

    return {
        'tabs': [
            {
                'name': '교과',
                'writer': '교과전담',
                'mainRows': gyogwa_main[:4],
                'attachRows': pad_attach(gyogwa_attach, 8),
            },
            {
                'name': '비교과',
                'writer': '',
                'mainRows': default_main,
                'attachRows': pad_attach(bigyo_attach, 12),
            },
        ]
    }


def tasks_from_entries(entries: list[dict]) -> list[dict]:
    tasks = []
    for e in entries:
        title = e['title'].strip()
        content = e['content'].strip()
        if not content and not valid_title(title):
            continue
        if not valid_title(title):
            tasks.append({'title': '업무 추진', 'content': content or title})
        else:
            tasks.append({'title': title, 'content': content})
    return tasks


def map_dept_results(sections: dict[str, str], dept_rows_meta: list[dict]) -> dict:
    results: dict[str, list] = {}
    for _sec_name, text in sections.items():
        dept_id = detect_dept(text)
        if not dept_id:
            continue
        entries = [e for e in parse_dept_section(text) if e.get('content')]
        if not entries:
            continue
        dept = next((d for d in dept_rows_meta if d['id'] == dept_id), None)
        if not dept:
            continue
        if dept.get('isSpecial'):
            results[f'{dept_id}-special'] = tasks_from_entries(entries[:10])
            continue
        row_entries = [r for r in dept.get('rows', []) if not r.get('isOther')]
        if not row_entries:
            continue
        n = len(row_entries)
        chunk = max(1, (len(entries) + n - 1) // n)
        for i, _row in enumerate(row_entries):
            slice_entries = entries[i * chunk : (i + 1) * chunk if i < n - 1 else len(entries)]
            tasks = tasks_from_entries(slice_entries)
            if tasks:
                results[f'{dept_id}-{i}'] = tasks
    return results


def format_events_md(events: list[dict]) -> str:
    lines = [
        '# 2026학년도 1학기 학교중간평가 협의록 (학년별)',
        '',
        '> 원본: `2026학년도 1학기 학교중간평가 협의록(합치기).hwpx`',
        '',
        '## 학년 행사 등',
        '',
        '| 순 | 월 | 대상학년 | 교육활동 | 부서 | 추진결과 | 학년별 의견 |',
        '|---:|---|---|---|---|---|---|',
    ]
    for ev in events:
        if ev['section'] != '학년 행사':
            continue
        ops = '; '.join(f'{g}학년: {op}' for g, op in sorted(ev.get('opinions', {}).items()))
        lines.append(
            f"| {ev['seq']} | {ev['month']} | {ev['grade']} | {ev['activity']} | {ev['dept']} | {ev.get('result','')} | {ops} |"
        )
    lines.extend(['', '## 교사·학부모·기타 운영', ''])
    for ev in events:
        if ev['section'] == '학년 행사':
            continue
        ops = '; '.join(f'{g}학년: {op}' for g, op in sorted(ev.get('opinions', {}).items()))
        lines.append(f"- **{ev['month']}** {ev['activity']} ({ev['dept']}) — {ops}")
    return '\n'.join(lines) + '\n'


def format_dept_md(sections: dict[str, str]) -> str:
    lines = [
        '# 2026 부서별 협의록',
        '',
        '> 원본: `2026 부서별 협의록.hwp`',
        '',
    ]
    for sec_name, text in sections.items():
        dept_id = detect_dept(text)
        label = next((k for k, v in DEPT_MAP.items() if v == dept_id), sec_name)
        lines.append(f'## {label}')
        lines.append('')
        entries = parse_dept_section(text)
        for e in entries[:12]:
            lines.append(f"### {e['title']}")
            lines.append('')
            lines.append(e['content'])
            lines.append('')
    return '\n'.join(lines)


def load_dept_meta() -> list[dict]:
    src = ROOT / 'js' / 'form6-data.js'
    text = src.read_text(encoding='utf-8')
    depts = []
    blocks = re.split(r'\n  \},\n  \{', text)
    for block in blocks:
        id_m = re.search(r"id: '([^']+)'", block)
        if not id_m:
            continue
        dept_id = id_m.group(1)
        name_m = re.search(r"name: '([^']+)'", block)
        is_special = 'isSpecial: true' in block
        rows = []
        for row in re.finditer(
            r"category: '([^']*)',\s*\n\s*person: '([^']*)',\s*\n\s*work: '([^']*)'(?:,\s*\n\s*isOther: true)?",
            block,
        ):
            rows.append(
                {
                    'category': row.group(1).replace('\\n', '\n'),
                    'person': row.group(2),
                    'work': row.group(3).replace('\\n', '\n'),
                    'isOther': 'isOther: true' in row.group(0),
                }
            )
        depts.append(
            {
                'id': dept_id,
                'name': name_m.group(1) if name_m else dept_id,
                'isSpecial': is_special,
                'rows': rows,
            }
        )
    return depts


def write_seed_js(master_rows, grade_data, dept_results, form4_data):
    payload = {
        'version': 2,
        'source': '2026-1학기 협의록 한글파일',
        'masterRows': master_rows,
        'gradeData': grade_data,
        'form4Data': form4_data,
        'deptResults': dept_results,
    }
    js = f"""/* 자동 생성 — python scripts/build-seed-data.py */
const SeedData = {json.dumps(payload, ensure_ascii=False, indent=2)};

const SeedImport = (() => {{
  const FLAG = 'midterm-seed-applied-v2';

  function alreadyApplied() {{
    return localStorage.getItem(FLAG) === '1';
  }}

  function markApplied() {{
    localStorage.setItem(FLAG, '1');
    localStorage.removeItem('midterm-seed-applied-v1');
  }}

  function normalizeTask(task) {{
    if (task?.title !== undefined) return task;
    const content = String(task?.content ?? '');
    const m = content.match(/^■\\s*(.+?)(?:\\n|$)/);
    if (m) {{
      return {{ id: task?.id || newId(), title: m[1].trim(), content: content.slice(m[0].length).trim() }};
    }}
    return {{ id: task?.id || newId(), title: '', content }};
  }}

  function applyMaster(force = false) {{
    if (!force && alreadyApplied()) return false;
    const data = MasterSheet.getData();
    data.writer = data.writer || '관리자';
    data.date = data.date || todayStr();
    data.rows = SeedData.masterRows.map((r) => MasterSheet.normalizeRow(r));
    MasterSheet.save(data);
    return true;
  }}

  function applyGrades(force = false) {{
    if (!force && alreadyApplied()) return false;
    Object.entries(SeedData.gradeData || {{}}).forEach(([prefix, payload]) => {{
      const cfg = FormGrade.getConfig(prefix);
      if (!cfg) return;
      const stored = {{
        date: todayStr(),
        attendees: '',
        mainRows: payload.mainRows?.length ? payload.mainRows : TemplateStore.getDefaultMainRows(prefix),
        attachRows: payload.attachRows?.length ? payload.attachRows : Array.from({{ length: TemplateStore.getDefaultAttachCount(prefix) }}, () => ({{ content: '', goodPoints: '', improvePoints: '' }})),
      }};
      localStorage.setItem(FormGrade.storageKey(cfg.id), JSON.stringify(stored));
    }});
    return true;
  }}

  function applyForm4(force = false) {{
    if (!force && alreadyApplied()) return false;
    const tabs = SeedData.form4Data?.tabs;
    if (!tabs?.length) return false;
    const mapped = tabs.map((tab, i) => ({{
      id: `seed-f4-${{i}}-${{Date.now()}}`,
      name: tab.name,
      writer: tab.writer || '',
      date: todayStr(),
      mainRows: tab.mainRows?.length ? tab.mainRows : [],
      attachRows: tab.attachRows?.length ? tab.attachRows : [],
    }}));
    localStorage.setItem('midterm-form4', JSON.stringify({{ activeTabId: mapped[0].id, tabs: mapped }}));
    return true;
  }}

  function applyDepartments(force = false) {{
    if (!force && alreadyApplied()) return false;
    const raw = localStorage.getItem('midterm-form6');
    const base = raw ? JSON.parse(raw) : {{ rowData: {{}}, customRows: {{}} }};
    Object.entries(SeedData.deptResults || {{}}).forEach(([key, tasks]) => {{
      const list = Array.isArray(tasks) ? tasks : [{{ title: '업무', content: String(tasks) }}];
      base.rowData[key] = {{
        tasks: list.map((t, i) => normalizeTask({{ ...t, id: `seed-${{key}}-${{i}}` }})),
        updatedAt: '협의록 시드 v2',
      }};
    }});
    localStorage.setItem('midterm-form6', JSON.stringify(base));
    return true;
  }}

  function applyAll(options = {{}}) {{
    const force = !!options.force;
    const master = applyMaster(force);
    const grades = applyGrades(force);
    const form4 = applyForm4(force);
    const depts = applyDepartments(force);
    if (master || grades || form4 || depts) markApplied();
    return {{ master, grades, form4, depts }};
  }}

  return {{ applyAll, applyMaster, applyGrades, applyForm4, applyDepartments, alreadyApplied, markApplied }};
}})();
"""
    OUT_JS.write_text(js, encoding='utf-8')


def main():
    hwpx = ROOT / '2026학년도 1학기 학교중간평가 협의록(합치기).hwpx'
    hwp = ROOT / '2026 부서별 협의록.hwp'
    DOCS.mkdir(exist_ok=True)

    grade_raw = extract_hwpx_text(hwpx)
    events = parse_events(grade_raw)
    (DOCS / '2026-학년별-중간평가-협의록.md').write_text(format_events_md(events), encoding='utf-8')

    sections = extract_hwp_sections(hwp)
    (DOCS / '2026-부서별-협의록.md').write_text(format_dept_md(sections), encoding='utf-8')

    master_rows = [event_to_master_row(ev, i + 1) for i, ev in enumerate(events)]
    grade_data = build_grade_seed(events)
    form4_data = build_form4_seed(events)
    dept_meta = load_dept_meta()
    dept_results = map_dept_results(sections, dept_meta)
    write_seed_js(master_rows, grade_data, dept_results, form4_data)

    print(f'events: {len(events)}')
    print(f'master rows: {len(master_rows)}')
    print(f'form4 tabs: {len(form4_data.get("tabs", []))}')
    print(f'dept result keys: {len(dept_results)}')
    print(f'wrote {OUT_JS}')


if __name__ == '__main__':
    main()
