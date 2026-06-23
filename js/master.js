const MasterSheet = (() => {
  const STORAGE_KEY = 'midterm-master';
  const SEMESTER1_MONTHS = ['3월', '4월', '5월', '6월', '7월'];
  const SEMESTER2_MONTHS = ['8월', '9월', '10월', '11월', '12월', '1월'];

  function inferSemester(month) {
    return SEMESTER2_MONTHS.includes(month) ? '2학기' : '1학기';
  }

  function emptyRow(month, semester) {
    return {
      id: newId(),
      semester,
      month,
      grade: '',
      activity: '',
      dept: '',
      goodPoints: '',
      improvePoints: '',
    };
  }

  function defaultRows() {
    return [
      ...SEMESTER1_MONTHS.map((month) => emptyRow(month, '1학기')),
      ...SEMESTER2_MONTHS.map((month) => emptyRow(month, '2학기')),
    ];
  }

  function normalizeRow(row) {
    const semester = row.semester || inferSemester(row.month);
    return {
      id: row.id || newId(),
      semester,
      month: row.month || SEMESTER1_MONTHS[0],
      grade: row.grade || '',
      activity: row.activity || '',
      dept: row.dept || '',
      goodPoints: row.goodPoints || '',
      improvePoints: row.improvePoints || '',
    };
  }

  function getData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { writer: '', date: todayStr(), rows: defaultRows() };
    try {
      const data = JSON.parse(raw);
      return {
        writer: data.writer || '',
        date: data.date || todayStr(),
        rows: data.rows?.length ? data.rows.map(normalizeRow) : defaultRows(),
      };
    } catch {
      return { writer: '', date: todayStr(), rows: defaultRows() };
    }
  }

  function getRows(semester = null) {
    const rows = getData().rows;
    return semester ? rows.filter((r) => r.semester === semester) : rows;
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    document.dispatchEvent(new CustomEvent('master-updated'));
  }

  function updateRows(updater) {
    const data = getData();
    data.rows = updater(data.rows.map(normalizeRow));
    save(data);
    return data;
  }

  function migrateFromForm5() {
    const legacy = localStorage.getItem('midterm-form5');
    if (!legacy || localStorage.getItem(STORAGE_KEY)) return;
    try {
      const data = JSON.parse(legacy);
      save({
        writer: data.writer || '',
        date: data.date || todayStr(),
        rows: (data.rows || []).map((r) => normalizeRow(r)),
      });
    } catch {
      /* ignore */
    }
  }

  function toExportRowsMaster() {
    return getRows().map((r) => [r.semester, r.month, r.grade, r.activity, r.dept]);
  }

  function toExportRowsEval() {
    return getRows().map((r) => [r.semester, r.month, r.grade, r.activity, r.dept, r.goodPoints, r.improvePoints]);
  }

  function importFromRows(matrix, sheet = 'master') {
    if (!matrix?.length) throw new Error('빈 파일입니다.');
    const start = String(matrix[0]?.[0] ?? '').includes('학기') || String(matrix[0]?.[0] ?? '').includes('월') ? 1 : 0;
    const parsed = matrix.slice(start).filter((row) => row.some((c) => String(c ?? '').trim()));
    if (!parsed.length) throw new Error('가져올 데이터가 없습니다.');

    const data = getData();
    const existing = data.rows.map(normalizeRow);

    if (sheet === 'full') {
      data.rows = parsed.map((row) => {
        const hasSemester = String(row[0] ?? '').includes('학기');
        if (hasSemester) {
          return normalizeRow({
            semester: String(row[0] ?? '').trim(),
            month: String(row[1] ?? '').trim(),
            grade: String(row[2] ?? ''),
            activity: String(row[3] ?? ''),
            dept: String(row[4] ?? ''),
            goodPoints: String(row[5] ?? ''),
            improvePoints: String(row[6] ?? ''),
          });
        }
        return normalizeRow({
          month: String(row[0] ?? '').trim(),
          grade: String(row[1] ?? ''),
          activity: String(row[2] ?? ''),
          dept: String(row[3] ?? ''),
          goodPoints: String(row[4] ?? ''),
          improvePoints: String(row[5] ?? ''),
        });
      });
    } else if (sheet === 'eval') {
      const byKey = new Map(existing.map((r) => [`${r.semester}|${r.month}|${r.activity}|${r.dept}`, r]));
      parsed.forEach((row) => {
        const base = normalizeRow({
          semester: String(row[0] ?? '').includes('학기') ? String(row[0]).trim() : inferSemester(String(row[0])),
          month: String(row[0] ?? '').includes('학기') ? String(row[1] ?? '').trim() : String(row[0] ?? '').trim(),
          grade: String(row[0] ?? '').includes('학기') ? String(row[2] ?? '') : String(row[1] ?? ''),
          activity: String(row[0] ?? '').includes('학기') ? String(row[3] ?? '') : String(row[2] ?? ''),
          dept: String(row[0] ?? '').includes('학기') ? String(row[4] ?? '') : String(row[3] ?? ''),
          goodPoints: String(row[0] ?? '').includes('학기') ? String(row[5] ?? '') : String(row[4] ?? ''),
          improvePoints: String(row[0] ?? '').includes('학기') ? String(row[6] ?? '') : String(row[5] ?? ''),
        });
        const key = `${base.semester}|${base.month}|${base.activity}|${base.dept}`;
        const found = byKey.get(key);
        if (found) {
          found.goodPoints = base.goodPoints;
          found.improvePoints = base.improvePoints;
        } else {
          existing.push(base);
          byKey.set(key, base);
        }
      });
      data.rows = existing;
    } else {
      data.rows = parsed.map((row) => {
        const hasSemester = String(row[0] ?? '').includes('학기');
        if (hasSemester) {
          return normalizeRow({
            semester: String(row[0] ?? '').trim(),
            month: String(row[1] ?? '').trim(),
            grade: String(row[2] ?? ''),
            activity: String(row[3] ?? ''),
            dept: String(row[4] ?? ''),
          });
        }
        return normalizeRow({
          month: String(row[0] ?? '').trim(),
          grade: String(row[1] ?? ''),
          activity: String(row[2] ?? ''),
          dept: String(row[3] ?? ''),
        });
      });
    }
    save(data);
    return data.rows.length;
  }

  migrateFromForm5();

  return {
    getData,
    getRows,
    save,
    updateRows,
    toExportRowsMaster,
    toExportRowsEval,
    importFromRows,
    defaultRows,
    normalizeRow,
    emptyRow,
    SEMESTER1_MONTHS,
    SEMESTER2_MONTHS,
    STORAGE_KEY,
  };
})();
