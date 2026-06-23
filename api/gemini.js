const { setCors, readBody, checkAdminKey } = require('../lib/api-utils');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    checkAdminKey(req);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

    const body = await readBody(req);
    const { prompt, submissions, formType } = body;

    const dataText = JSON.stringify(submissions || [], null, 2).slice(0, 80000);
    const systemPrompt =
      prompt ||
      `당신은 학교 중간평가 협의록 분석 assistant입니다. 아래 ${formType || '제출'} 데이터를 한국어로 요약·분석하세요.
- 공통으로 좋았던 점
- 보완이 필요한 점
- 학년/부서별 특이사항
- 관리자에게 제안할 후속 조치`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n--- 데이터 ---\n${dataText}` }] }],
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return res.status(502).json({ error: 'Gemini API 오류', detail: err.slice(0, 500) });
    }

    const result = await geminiRes.json();
    const text =
      result.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') || '분석 결과 없음';

    return res.status(200).json({ analysis: text });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Server error' });
  }
};
