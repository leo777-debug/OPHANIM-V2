export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { intelligenceData, pastAnalyses } = req.body;
  if (!intelligenceData) return res.status(400).json({ error: 'Missing intelligenceData' });

  // Summarise incoming data for context
  const data = Array.isArray(intelligenceData) ? intelligenceData : [intelligenceData];
  const milAircraft = data.filter(e => e?.label?.startsWith('MIL:') || e?.intensity > 0.8).length;
  const vessels     = data.filter(e => e?.type === 'vessel').length;
  const seismic     = data.filter(e => e?.id?.startsWith('quake-')).length;
  const jamming     = data.filter(e => e?.id?.startsWith('jam-')).length;
  const conflicts   = data.filter(e => e?.type === 'conflict').length;
  const fires       = data.filter(e => e?.id?.startsWith('firms-')).length;

  const memoryStr = Array.isArray(pastAnalyses) && pastAnalyses.length > 0
    ? pastAnalyses.slice(-3).map(a =>
        `[${a.timestamp || 'unknown'}] Level:${a.threat_level} Score:${a.threat_score}% — ${a.summary || 'no summary'}`
      ).join('\n')
    : 'No prior analyses in this session.';

  // ── SYSTEM PROMPT (goes inside messages array for DeepSeek) ──────────────
  const systemPrompt = `You are ATLAS — an advanced open-source intelligence analyst specialising in MENA geopolitics, maritime security, and military pattern recognition.

KNOWN ESCALATION PATTERNS:
- Hormuz Swarm: vessel cluster + AIS dark near Qeshm/Abu Musa + military aircraft = HIGH
- Houthi Pre-Strike: Yemen shallow seismic M1.5-2.5 + ADS-B gaps + news = ORANGE-RED  
- IAF Operation: GPS jamming expansion northern Israel + UAV spike = ELEVATED
- Cyber-Kinetic: Internet blackout + GPS spoofing + military aircraft = CRITICAL precursor

CURRENT SESSION MEMORY:
${memoryStr}

LIVE DATA SUMMARY:
- Military/high-intensity aircraft: ${milAircraft}
- Vessels tracked: ${vessels}
- Seismic events: ${seismic}
- GPS jamming zones: ${jamming}
- Conflict events: ${conflicts}
- Active fires: ${fires}
- Total events: ${data.length}

You MUST respond with ONLY a raw JSON object. No markdown, no backticks, no explanation outside the JSON.

{
  "threat_score": <integer 0-100>,
  "threat_level": "<GREEN|YELLOW|ORANGE|RED|BLACK>",
  "summary": "<2-3 sentence executive assessment>",
  "pattern_match": "<name of matching escalation pattern or 'No known pattern match'>",
  "prediction": "<what is likely in next 6-24 hours>",
  "confidence": "<LOW|MEDIUM|HIGH>",
  "evidence": ["<specific finding 1>", "<specific finding 2>", "<specific finding 3>"],
  "contributing_factors": {
    "aviation": "<assessment>",
    "maritime": "<assessment>",
    "seismic": "<assessment>",
    "electronic_warfare": "<assessment>",
    "information": "<assessment>"
  },
  "aerial_anomalies": ["<anomaly>"],
  "maritime_anomalies": ["<anomaly>"],
  "seismic_analysis": "<detailed seismic assessment>",
  "imagery_analysis": "Satellite imagery unavailable for this analysis.",
  "gps_jamming_detected": <true|false>,
  "recommendation": "<specific actionable recommendation>",
  "new_lesson": "<one new intelligence lesson or null>"
}`;

  const userPrompt = `Analyse this intelligence package and return JSON only:\n\n${JSON.stringify(data.slice(0, 40)).slice(0, 3500)}`;

  try {
    const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        max_tokens: 2000,
        temperature: 0.3,
        messages: [
          // ✅ FIX 1: system goes INSIDE messages array
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt }
        ]
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('DeepSeek HTTP error:', resp.status, errText);
      throw new Error(`DeepSeek API error: ${resp.status}`);
    }

    const apiData = await resp.json();

    if (!apiData.choices?.[0]?.message?.content) {
      console.error('Bad DeepSeek response:', JSON.stringify(apiData));
      throw new Error("No content in DeepSeek response");
    }

    const raw = apiData.choices[0].message.content;
    console.log('DeepSeek raw response:', raw.slice(0, 200));

    // ✅ FIX 2: strip markdown fences before parsing
    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    // ✅ FIX 3: extract JSON more robustly
    let analysis = {};
    try {
      // Try direct parse first
      analysis = JSON.parse(cleaned);
    } catch {
      // Fall back to regex extraction
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try { analysis = JSON.parse(match[0]); }
        catch (e2) {
          console.error('JSON parse failed after extraction:', e2.message);
          console.error('Cleaned text was:', cleaned.slice(0, 500));
        }
      }
    }

    // ✅ FIX 4: never return undefined — always have real values
    const result = {
      threat_score:         typeof analysis.threat_score === 'number' ? analysis.threat_score : 25,
      threat_level:         analysis.threat_level || "GREEN",
      summary:              analysis.summary || "Analysis completed. Insufficient data for detailed assessment.",
      pattern_match:        analysis.pattern_match || "No known pattern match",
      prediction:           analysis.prediction || "Continue monitoring current signals.",
      confidence:           analysis.confidence || "LOW",
      evidence:             Array.isArray(analysis.evidence) ? analysis.evidence : ["No specific findings detected in current data stream."],
      contributing_factors: analysis.contributing_factors || {
        aviation: "No significant aerial activity detected.",
        maritime: "No significant maritime activity detected.",
        seismic: "No seismic anomalies detected.",
        electronic_warfare: "No EW activity detected.",
        information: "No significant news signals."
      },
      aerial_anomalies:     Array.isArray(analysis.aerial_anomalies) ? analysis.aerial_anomalies : [],
      maritime_anomalies:   Array.isArray(analysis.maritime_anomalies) ? analysis.maritime_anomalies : [],
      seismic_analysis:     analysis.seismic_analysis || "No seismic events requiring assessment.",
      imagery_analysis:     analysis.imagery_analysis || "Satellite imagery not available for this analysis run.",
      gps_jamming_detected: analysis.gps_jamming_detected === true,
      recommendation:       analysis.recommendation || "Maintain current monitoring posture. Refresh data streams.",
      new_lesson:           analysis.new_lesson || null,
      gibs_analyzed:        false,
      timestamp:            new Date().toISOString()
    };

    console.log('Analysis result — level:', result.threat_level, 'score:', result.threat_score);
    res.json(result);

  } catch (err) {
    console.error('Analyze error:', err.message);
    // ✅ Return structured error response so frontend does not crash
    res.status(500).json({
      error: err.message,
      threat_score: 0,
      threat_level: "GREEN",
      summary: `Analysis failed: ${err.message}. Check DEEPSEEK_API_KEY in Vercel environment variables.`,
      evidence: ["API error — check server logs"],
      recommendation: "Verify DEEPSEEK_API_KEY is set correctly in Vercel project settings.",
      pattern_match: "N/A",
      prediction: "N/A",
      confidence: "LOW",
      contributing_factors: {},
      aerial_anomalies: [],
      maritime_anomalies: [],
      seismic_analysis: "",
      imagery_analysis: "",
      gps_jamming_detected: false,
      gibs_analyzed: false,
      timestamp: new Date().toISOString()
    });
  }
}
