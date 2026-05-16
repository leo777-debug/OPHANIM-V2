export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { intelligenceData, pastAnalyses, region } = req.body;
  if (!intelligenceData) return res.status(400).json({ error: 'Missing intelligenceData' });

  // ── Summarise incoming data ───────────────────────────────────────────────
  const data = Array.isArray(intelligenceData) ? intelligenceData : [intelligenceData];

  const milAircraft = data.filter(e => e?.label?.startsWith('MIL') || e?.intensity >= 0.8).length;
  const vessels     = data.filter(e => e?.type === 'vessel').length;
  const seismic     = data.filter(e => e?.id?.startsWith('quake-')).length;
  const jamming     = data.filter(e => e?.id?.startsWith('jam-')).length;
  const conflicts   = data.filter(e => e?.type === 'conflict').length;
  const fires       = data.filter(e => e?.id?.startsWith('firms-')).length;
  const satellites  = data.filter(e => e?.type === 'satellite').length;
  const outages     = data.filter(e => e?.id?.startsWith('blackout-')).length;

  const memoryStr = Array.isArray(pastAnalyses) && pastAnalyses.length > 0
    ? pastAnalyses.slice(-3).map(a =>
        `[${a.timestamp || 'unknown'}] ${a.threat_level} ${a.threat_score}% — ${a.summary || 'no summary'}`
      ).join('\n')
    : 'No prior analyses this session.';

  // ── System prompt ─────────────────────────────────────────────────────────
  const systemPrompt = `You are ATLAS, an advanced open-source intelligence analyst specialising in geopolitics, maritime security, and military pattern recognition. Region of interest: ${region || 'Global'}.

KNOWN ESCALATION PATTERNS (check for matches):
- Hormuz Swarm: vessel cluster + AIS dark near Qeshm/Abu Musa + military aircraft pair = HIGH
- Houthi Pre-Strike: Yemen shallow seismic M1.5-2.5 depth<5km + ADS-B gaps + news = ORANGE-RED
- IAF Operation: GPS jamming expanding from northern Israel + UAV ADS-B spike = ELEVATED
- Cyber-Kinetic: Internet blackout + GPS spoofing + military aircraft convergence = CRITICAL

SESSION MEMORY (last 3 analyses):
${memoryStr}

CURRENT PICTURE:
- Military/high-intensity assets: ${milAircraft}
- Vessels: ${vessels}
- Seismic events: ${seismic}
- GPS jamming zones: ${jamming}
- Conflict events: ${conflicts}
- Active fires: ${fires}
- Satellites: ${satellites}
- Internet outages: ${outages}
- Total events: ${data.length}

INSTRUCTIONS:
1. Analyse the data for threat indicators, anomalies, and escalation patterns.
2. Score the threat 0-100 and assign a level: GREEN (0-24), YELLOW (25-44), ORANGE (45-64), RED (65-84), BLACK (85-100).
3. You MUST return ONLY a raw JSON object. No markdown fences, no backticks, no explanation text outside the JSON.

Required JSON shape:
{
  "threat_score": <integer 0-100>,
  "threat_level": "<GREEN|YELLOW|ORANGE|RED|BLACK>",
  "summary": "<2-3 sentence executive assessment of what is happening>",
  "prediction": "<what is most likely to happen in the next 6-48 hours based on current signals>",
  "pattern_match": "<name of matching escalation pattern or 'No known pattern match'>",
  "confidence": "<LOW|MEDIUM|HIGH>",
  "evidence": [
    "<specific finding 1 referencing actual data>",
    "<specific finding 2>",
    "<specific finding 3>"
  ],
  "factors": [
    { "label": "Aviation", "contribution": <integer>, "detail": "<one sentence>" },
    { "label": "Maritime", "contribution": <integer>, "detail": "<one sentence>" },
    { "label": "Seismic", "contribution": <integer>, "detail": "<one sentence>" },
    { "label": "Electronic Warfare", "contribution": <integer>, "detail": "<one sentence>" },
    { "label": "Information", "contribution": <integer>, "detail": "<one sentence>" }
  ],
  "aerial_anomalies": ["<anomaly or empty array>"],
  "maritime_anomalies": ["<anomaly or empty array>"],
  "seismic_analysis": "<one paragraph seismic assessment>",
  "imagery_analysis": "Satellite imagery not available for this analysis run.",
  "gps_jamming_detected": <true|false>,
  "recommendation": "<specific actionable recommendation for an analyst or decision-maker>",
  "new_lesson": {
    "title": "<short lesson title>",
    "lesson": "<one paragraph intelligence lesson learned from this analysis>",
    "context": "ASI-EVOLVE session learning"
  }
}`;

  const userPrompt = `Analyse this intelligence data and return JSON only:\n\n${JSON.stringify(data.slice(0, 50)).slice(0, 4000)}`;

  try {
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 2000,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt }
        ]
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('DeepSeek HTTP error:', resp.status, errText);
      throw new Error(`DeepSeek API returned ${resp.status}: ${errText.slice(0, 200)}`);
    }

    const apiData = await resp.json();

    if (!apiData.choices?.[0]?.message?.content) {
      console.error('Unexpected DeepSeek response shape:', JSON.stringify(apiData).slice(0, 400));
      throw new Error('No content in DeepSeek response');
    }

    const raw = apiData.choices[0].message.content;
    console.log('DeepSeek raw (first 300):', raw.slice(0, 300));

    // Strip markdown fences if present
    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    // Parse JSON — try direct then regex fallback
    let analysis = {};
    try {
      analysis = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try { analysis = JSON.parse(match[0]); }
        catch (e2) {
          console.error('JSON parse failed:', e2.message, 'text:', cleaned.slice(0, 300));
        }
      }
    }

    // Build safe response — no field is ever undefined
    const score = typeof analysis.threat_score === 'number' ? analysis.threat_score : 20;
    const level = ['GREEN','YELLOW','ORANGE','RED','BLACK'].includes(analysis.threat_level)
      ? analysis.threat_level
      : score >= 65 ? 'RED' : score >= 45 ? 'ORANGE' : score >= 25 ? 'YELLOW' : 'GREEN';

    const defaultFactors = [
      { label: 'Aviation',           contribution: Math.round(score * 0.25), detail: 'No significant aerial indicators.' },
      { label: 'Maritime',           contribution: Math.round(score * 0.25), detail: 'No significant maritime indicators.' },
      { label: 'Seismic',            contribution: Math.round(score * 0.20), detail: 'No seismic anomalies detected.' },
      { label: 'Electronic Warfare', contribution: Math.round(score * 0.15), detail: 'No EW activity detected.' },
      { label: 'Information',        contribution: Math.round(score * 0.15), detail: 'No significant information signals.' },
    ];

    const result = {
      threat_score:          score,
      threat_level:          level,
      summary:               analysis.summary               || `Current threat level assessed as ${level}. ${data.length} events analysed across all active data streams.`,
      prediction:            analysis.prediction            || 'No significant change expected in the next 24 hours based on current signals.',
      pattern_match:         analysis.pattern_match         || 'No known escalation pattern match detected.',
      confidence:            analysis.confidence            || 'LOW',
      evidence:              Array.isArray(analysis.evidence) && analysis.evidence.length > 0
                               ? analysis.evidence
                               : [`${data.length} events analysed. No high-confidence threat indicators detected.`],
      factors:               Array.isArray(analysis.factors) && analysis.factors.length > 0
                               ? analysis.factors
                               : defaultFactors,
      aerial_anomalies:      Array.isArray(analysis.aerial_anomalies)   ? analysis.aerial_anomalies   : [],
      maritime_anomalies:    Array.isArray(analysis.maritime_anomalies) ? analysis.maritime_anomalies : [],
      seismic_analysis:      analysis.seismic_analysis      || `${seismic} seismic event(s) in dataset. No anomalous shallow signatures detected.`,
      imagery_analysis:      analysis.imagery_analysis      || 'Satellite imagery not available for this analysis run.',
      gps_jamming_detected:  analysis.gps_jamming_detected === true,
      recommendation:        analysis.recommendation        || 'Maintain current monitoring posture. Refresh all data streams and run analysis again in 30 minutes.',
      new_lesson:            analysis.new_lesson            || null,
      gibs_analyzed:         false,
      timestamp:             new Date().toISOString()
    };

    console.log('Returning — level:', result.threat_level, 'score:', result.threat_score);
    return res.json(result);

  } catch (err) {
    console.error('Analyze handler error:', err.message);

    // Always return a valid shaped object so frontend never shows undefined
    return res.status(500).json({
      threat_score:          0,
      threat_level:          'GREEN',
      summary:               `Analysis failed: ${err.message}. Check that DEEPSEEK_API_KEY is set in Vercel environment variables.`,
      prediction:            'Unable to generate prediction — API error.',
      pattern_match:         'N/A',
      confidence:            'LOW',
      evidence:              [`API error: ${err.message}`],
      factors:               [
        { label: 'Error', contribution: 0, detail: err.message }
      ],
      aerial_anomalies:      [],
      maritime_anomalies:    [],
      seismic_analysis:      'Analysis unavailable.',
      imagery_analysis:      'Analysis unavailable.',
      gps_jamming_detected:  false,
      recommendation:        'Fix API error then re-run analysis. Verify DEEPSEEK_API_KEY in Vercel project settings → Environment Variables.',
      new_lesson:            null,
      gibs_analyzed:         false,
      timestamp:             new Date().toISOString()
    });
  }
}
