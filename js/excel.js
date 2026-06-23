const ExcelIO = (() => {
  function ensureXLSX() {
    if (typeof XLSX === 'undefined') {
      showToast('Excel 라이브러리를 불러오는 중입니다. 잠시 후 다시 시도하세요.');
      return false;
    }
    return true;
  }

  function download(filename, sheetName, headers, rows) {
    if (!ensureXLSX()) return;
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    XLSX.writeFile(wb, filename);
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      if (!ensureXLSX()) {
        reject(new Error('XLSX unavailable'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          resolve(matrix);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  function upload(onParsed) {
    triggerFileInput('.xlsx,.xls,.csv', async (file) => {
      try {
        const matrix = await readFile(file);
        onParsed(matrix);
      } catch {
        showToast('Excel 파일을 읽을 수 없습니다.');
      }
    });
  }

  return { download, readFile, upload };
})();

const FormExports = {
  master() {
    const data = MasterSheet.getData();
    ExcelIO.download(
      '마스터시트_행사목록.xlsx',
      '행사마스터',
      MASTER_HEADERS,
      MasterSheet.toExportRowsMaster()
    );
  },

  grade(prefix) {
    const cfg = FormGrade.getConfig(prefix);
    if (!cfg) return;
    const raw = localStorage.getItem(FormGrade.storageKey(cfg.id));
    const data = raw ? JSON.parse(raw) : {};
    const main = (data.mainRows || []).map((r) => [
      r.month,
      r.grade,
      r.content,
      r.satisfaction,
      r.reason,
    ]);
    const attach = (data.attachRows || []).map((r, i) => [i + 1, r.content, r.evaluation]);
    ExcelIO.download(`${cfg.label}_협의록.xlsx`, cfg.label, ['월', '대상학년', '내용', '만족도', '평가사유'], main);
    if (attach.length) {
      setTimeout(() => {
        ExcelIO.download(`${cfg.label}_첨부.xlsx`, '첨부', ['번호', '교사학부모기타', '평가'], attach);
      }, 300);
    }
  },

  form4(tabId) {
    Form4.exportExcel(tabId);
  },

  form6(deptId) {
    Form6.exportExcel(deptId);
  },
};
