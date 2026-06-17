import { useState, useRef, useEffect } from "react";

const SUGGESTED = [
  "I have fever, headache and fatigue",
  "Check for abnormal values in my report",
  "Latest FDA approved drugs for diabetes 2024?",
  "Summarize the key findings in the document",
];

// ── Symptom Classifier Card ─────────────────────
const SymptomCard = ({ data }) => {
  if (!data || data.error) return null;
  const urgencyColors = {
    LOW: { bg: "#052e16", border: "#16a34a", text: "#4ade80", badge: "#166534" },
    MEDIUM: { bg: "#1c1917", border: "#ca8a04", text: "#facc15", badge: "#854d0e" },
    HIGH: { bg: "#1c0a00", border: "#ea580c", text: "#fb923c", badge: "#9a3412" },
    EMERGENCY: { bg: "#1c0000", border: "#dc2626", text: "#f87171", badge: "#7f1d1d" },
  };
  const uc = urgencyColors[data.urgency] || urgencyColors.MEDIUM;

  return (
    <div style={{ marginTop: 12, borderRadius: 20, overflow: "hidden", border: `1px solid ${uc.border}`, background: uc.bg }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${uc.border}20` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: uc.text }}>🔍 Symptom Analysis</div>
          <div style={{ background: uc.badge, color: uc.text, fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 20, letterSpacing: "0.08em" }}>
            {data.urgency}
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>{data.urgency_reason}</div>
      </div>

      {/* Conditions */}
      <div style={{ padding: "20px 24px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#374151", marginBottom: 16 }}>Possible Conditions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {data.conditions?.map((c, i) => (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#f9fafb" }}>{c.name}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: uc.text, fontVariantNumeric: "tabular-nums" }}>{c.probability}%</div>
              </div>
              {/* Progress bar */}
              <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 6 }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  width: `${c.probability}%`,
                  background: `linear-gradient(90deg, ${uc.border}, ${uc.text})`,
                  transition: "width 1s ease",
                }} />
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>{c.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Red flags */}
      {data.red_flags?.length > 0 && (
        <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(220,38,38,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#f87171", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>⚠️ Red Flags</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.red_flags.map((f, i) => (
              <span key={i} style={{ fontSize: 12, background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)", color: "#f87171", padding: "3px 10px", borderRadius: 20 }}>{f}</span>
            ))}
          </div>
        </div>
      )}

      {/* Action */}
      <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Recommended Action</div>
        <div style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6 }}>{data.recommended_action}</div>
      </div>
    </div>
  );
};

// ── Anomaly Detector Card ───────────────────────
const AnomalyCard = ({ data }) => {
  if (!data || data.error) return null;
  const riskColors = {
    LOW: { text: "#4ade80", bg: "#052e16", border: "#16a34a" },
    MEDIUM: { text: "#facc15", bg: "#1c1917", border: "#ca8a04" },
    HIGH: { text: "#f87171", bg: "#1c0000", border: "#dc2626" },
  };
  const rc = riskColors[data.risk_level] || riskColors.LOW;

  return (
    <div style={{ marginTop: 12, borderRadius: 20, overflow: "hidden", border: `1px solid ${rc.border}`, background: rc.bg }}>
      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: rc.text, marginBottom: 4 }}>⚠️ Anomaly Detection</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#f9fafb" }}>{data.total_anomalies} <span style={{ fontSize: 14, fontWeight: 400, color: "#6b7280" }}>abnormal values</span></div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Risk Level</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: rc.text }}>{data.risk_level}</div>
        </div>
      </div>

      {/* Abnormal values */}
      {data.anomalies?.length > 0 && (
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#374151", marginBottom: 14 }}>Abnormal Values</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.anomalies.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 16px" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#f9fafb" }}>{a.test}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Ref: {a.reference}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: a.severity === "CRITICAL" ? "#f87171" : "#fb923c" }}>{a.value} <span style={{ fontSize: 11, fontWeight: 400 }}>{a.unit}</span></div>
                  <div style={{ fontSize: 11, marginTop: 2, color: a.status.includes("ABOVE") ? "#f87171" : "#60a5fa" }}>{a.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Normal values */}
      {data.normal_values?.length > 0 && (
        <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>✅ Normal Values</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.normal_values.map((n, i) => (
              <span key={i} style={{ fontSize: 12, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#6ee7b7", padding: "4px 12px", borderRadius: 20, fontWeight: 600 }}>
                {n.test}: {n.value} {n.unit}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Message Renderer ────────────────────────────
const MessageContent = ({ msg }) => {
  const formatText = (text) =>
    text.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#6ee7b7">$1</strong>').replace(/\n/g, "<br/>");

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: formatText(msg.text) }} />
      {msg.ml_type === "symptom_classifier" && msg.ml_data && <SymptomCard data={msg.ml_data} />}
      {msg.ml_type === "anomaly_detector" && msg.ml_data && <AnomalyCard data={msg.ml_data} />}
    </div>
  );
};

// ── Typing Dots ─────────────────────────────────
const TypingDots = () => (
  <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 0" }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "linear-gradient(135deg,#10b981,#059669)", animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
    ))}
  </div>
);

const SourceBadge = ({ web, mlType }) => {
  const badges = {
    symptom_classifier: { bg: "rgba(251,146,60,0.1)", border: "rgba(251,146,60,0.3)", color: "#fb923c", label: "🔍 ML Symptom Classifier" },
    anomaly_detector:   { bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)", color: "#f87171", label: "⚠️ ML Anomaly Detector" },
    rag:                { bg: web ? "rgba(16,185,129,0.1)" : "rgba(5,150,105,0.1)", border: web ? "rgba(16,185,129,0.3)" : "rgba(5,150,105,0.3)", color: web ? "#10b981" : "#6ee7b7", label: web ? "🌐 Live Web Search" : "📄 Your Documents" },
  };
  const b = badges[mlType] || badges.rag;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", padding: "3px 10px", borderRadius: 20, marginBottom: 8, background: b.bg, border: `1px solid ${b.border}`, color: b.color }}>
      {b.label}
    </div>
  );
};

const EKGLine = () => (
  <svg viewBox="0 0 200 40" style={{ width: 120, height: 24, opacity: 0.7 }}>
    <polyline points="0,20 30,20 40,5 50,35 60,20 80,20 90,2 100,38 110,20 130,20 140,10 150,30 160,20 200,20"
      fill="none" stroke="url(#ekg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: "ekgDraw 2s ease-in-out infinite" }} />
    <defs>
      <linearGradient id="ekg" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#34d399" />
      </linearGradient>
    </defs>
  </svg>
);

const Avatar = ({ isAI }) => (
  <div style={{ width: 34, height: 34, borderRadius: isAI ? 12 : "50%", flexShrink: 0, background: isAI ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#1e2a1e,#111a11)", border: isAI ? "none" : "1px solid rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isAI ? 16 : 14, boxShadow: isAI ? "0 4px 14px rgba(16,185,129,0.35)" : "none" }}>
    {isAI ? "🩺" : "👤"}
  </div>
);

export default function PulseAIChat() {
  const [messages, setMessages] = useState([{
    id: 0, role: "ai", web: false, ml_type: "rag",
    text: "Hello! I'm **PulseAI**, your medical document assistant.\n\nI can analyze symptoms, detect anomalies in lab reports, search live medical sources, and answer questions from your documents.\n\nHow can I help you today?",
    time: new Date(),
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadedFiles] = useState(["week_01.pdf", "week_02.pdf"]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const simulateResponse = async (question) => {
    try {
      const res = await fetch("http://localhost:5000/api/ask", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });
      const data = await res.json();
      if (data.error) return { text: `⚠️ Error: ${data.error}`, web: false, ml_type: "rag", ml_data: null };
      return { text: data.answer, web: data.web_used, ml_type: data.ml_type || "rag", ml_data: data.ml_data || null };
    } catch {
      return { text: "⚠️ Could not connect to backend. Make sure `python app.py` is running on port 5000.", web: false, ml_type: "rag", ml_data: null };
    }
  };

  const sendMessage = async (text) => {
    const q = text || input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages(prev => [...prev, { id: Date.now(), role: "user", text: q, time: new Date() }]);
    setLoading(true);
    const { text: answer, web, ml_type, ml_data } = await simulateResponse(q);
    setMessages(prev => [...prev, { id: Date.now() + 1, role: "ai", text: answer, web, ml_type, ml_data, time: new Date() }]);
    setLoading(false);
    inputRef.current?.focus();
  };

  const formatTime = (d) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#060c06", color: "#e2e8e2", height: "100vh", display: "flex", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sora:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes typingBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes ekgDraw { 0%,100%{stroke-dashoffset:0} 50%{stroke-dashoffset:40} }
        .msg-in { animation: fadeSlideUp 0.4s ease forwards; }
        .input-field { background: transparent; border: none; outline: none; color: #d1fae5; font-size: 15px; width: 100%; font-family: inherit; resize: none; }
        .input-field::placeholder { color: #1a3a1a; }
        .send-btn { background: linear-gradient(135deg,#10b981,#059669); border: none; border-radius: 12px; width: 44px; height: 44px; cursor: pointer; display:flex; align-items:center; justify-content:center; font-size:18px; transition: all 0.2s ease; flex-shrink:0; }
        .send-btn:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(16,185,129,0.45); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .suggestion-chip { background: rgba(16,185,129,0.04); border: 1px solid rgba(16,185,129,0.12); border-radius: 20px; padding: 8px 14px; font-size: 12.5px; color: #2d5a3d; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .suggestion-chip:hover { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.35); color: #10b981; }
        .file-chip { display:flex; align-items:center; gap:8px; background:rgba(16,185,129,0.04); border:1px solid rgba(16,185,129,0.1); border-radius:10px; padding:10px 12px; font-size:12px; color:#2d5a3d; }
        .nav-item { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:12px; font-size:13px; color:#2d5a3d; cursor:pointer; transition:all 0.2s; }
        .nav-item:hover { background:rgba(16,185,129,0.07); color:#6ee7b7; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#0d2a0d;border-radius:2px}
      `}</style>

      {/* SIDEBAR */}
      {sidebarOpen && (
        <div style={{ width: 260, background: "#080f08", borderRight: "1px solid rgba(16,185,129,0.08)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(16,185,129,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 4px 14px rgba(16,185,129,0.35)" }}>🩺</div>
              <div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 16, color: "#f0fdf4" }}>PulseAI</div>
                <div style={{ fontSize: 11, color: "#1a3a1a" }}>Medical Assistant</div>
              </div>
            </div>
          </div>

          <div style={{ padding: "12px 14px" }}>
            <button onClick={() => setMessages([{ id: 0, role: "ai", web: false, ml_type: "rag", text: "Hello! I'm **PulseAI**. How can I help you today?", time: new Date() }])}
              style={{ width: "100%", background: "linear-gradient(135deg,rgba(16,185,129,0.12),rgba(5,150,105,0.12))", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: "10px 16px", color: "#10b981", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              ✦ New Conversation
            </button>
          </div>

          {/* ML Features list */}
          <div style={{ padding: "8px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#1a3a1a", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>ML Features Active</div>
            {[["🔍", "Symptom Classifier"], ["⚠️", "Anomaly Detector"], ["📊", "Report Summarizer"], ["🌐", "Web Search"]].map(([icon, label]) => (
              <div key={label} className="nav-item">
                <span>{icon}</span> {label}
                <span style={{ marginLeft: "auto", fontSize: 10, background: "rgba(16,185,129,0.12)", color: "#10b981", padding: "2px 7px", borderRadius: 10, fontWeight: 600 }}>ON</span>
              </div>
            ))}
          </div>

          <div style={{ padding: "16px 14px", marginTop: "auto", borderTop: "1px solid rgba(16,185,129,0.08)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#1a3a1a", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Loaded Documents</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {uploadedFiles.map(f => (
                <div key={f} className="file-chip">
                  <span style={{ fontSize: 14 }}>📄</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f}</span>
                  <span style={{ color: "#10b981", fontSize: 10 }}>●</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: "#0d2a0d", lineHeight: 1.5, padding: "8px 10px", background: "rgba(16,185,129,0.03)", borderRadius: 8 }}>
              ⚕️ For informational use only. Not medical advice.
            </div>
          </div>
        </div>
      )}

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* TOP BAR */}
        <div style={{ padding: "14px 24px", borderBottom: "1px solid rgba(16,185,129,0.08)", display: "flex", alignItems: "center", gap: 16, background: "rgba(6,12,6,0.85)", backdropFilter: "blur(12px)" }}>
          <button onClick={() => setSidebarOpen(p => !p)} style={{ background: "none", border: "none", color: "#2d5a3d", cursor: "pointer", fontSize: 18, padding: 4, borderRadius: 8 }}>☰</button>
          <EKGLine />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, color: "#f0fdf4" }}>Medical Document Q&A</div>
            <div style={{ fontSize: 12, color: "#1a3a1a" }}>{uploadedFiles.length} documents · RAG + ML + Web Search active</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#10b981", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 20, padding: "5px 12px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "block", animation: "pulse 2s ease-in-out infinite" }} />
            LLaMA 3.3 · 70B
          </div>
        </div>

        {/* MESSAGES */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 0" }}>
          <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 24 }}>
            {messages.map((msg) => (
              <div key={msg.id} className="msg-in" style={{ display: "flex", gap: 12, alignItems: "flex-start", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                <Avatar isAI={msg.role === "ai"} />
                <div style={{ maxWidth: "82%", display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  {msg.role === "ai" && msg.id !== 0 && <SourceBadge web={msg.web} mlType={msg.ml_type} />}
                  <div style={{
                    padding: "14px 18px",
                    borderRadius: msg.role === "ai" ? "4px 18px 18px 18px" : "18px 4px 18px 18px",
                    background: msg.role === "ai" ? "rgba(16,185,129,0.04)" : "linear-gradient(135deg,#10b981,#059669)",
                    border: msg.role === "ai" ? "1px solid rgba(16,185,129,0.1)" : "none",
                    fontSize: 14, lineHeight: 1.75,
                    color: msg.role === "ai" ? "#a7f3d0" : "white",
                    boxShadow: msg.role === "user" ? "0 4px 20px rgba(16,185,129,0.25)" : "none",
                    width: "100%",
                  }}>
                    <MessageContent msg={msg} />
                  </div>
                  <div style={{ fontSize: 11, color: "#0d2a0d", marginTop: 6, paddingLeft: 2 }}>{formatTime(msg.time)}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="msg-in" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <Avatar isAI />
                <div>
                  <div style={{ fontSize: 11, color: "#10b981", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ animation: "pulse 1s ease-in-out infinite" }}>⚡</span> Analyzing…
                  </div>
                  <div style={{ padding: "14px 18px", borderRadius: "4px 18px 18px 18px", background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.1)" }}>
                    <TypingDots />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* SUGGESTIONS */}
        {messages.length <= 1 && (
          <div style={{ padding: "0 24px 16px", maxWidth: 780, margin: "0 auto", width: "100%" }}>
            <div style={{ fontSize: 12, color: "#1a3a1a", marginBottom: 10, fontWeight: 500 }}>Try asking:</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SUGGESTED.map(s => <button key={s} className="suggestion-chip" onClick={() => sendMessage(s)}>{s}</button>)}
            </div>
          </div>
        )}

        {/* INPUT */}
        <div style={{ padding: "12px 24px 20px", borderTop: "1px solid rgba(16,185,129,0.08)", background: "rgba(6,12,6,0.7)", backdropFilter: "blur(12px)" }}>
          <div style={{ maxWidth: 780, margin: "0 auto" }}>
            <div style={{ background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.1)", borderRadius: 16, padding: "12px 14px 10px", display: "flex", gap: 12, alignItems: "flex-end", transition: "border-color 0.2s" }}
              onFocus={e => e.currentTarget.style.borderColor = "rgba(16,185,129,0.4)"}
              onBlur={e => e.currentTarget.style.borderColor = "rgba(16,185,129,0.1)"}>
              <textarea ref={inputRef} className="input-field" rows={1} value={input}
                onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Describe symptoms, ask about reports, or any health question…"
                style={{ lineHeight: 1.6, maxHeight: 120, overflowY: "auto" }} />
              <button className="send-btn" onClick={() => sendMessage()} disabled={!input.trim() || loading}>
                {loading ? "⏳" : "➤"}
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 10, fontSize: 11, color: "#0d2a0d", gap: 16 }}>
              <span>↵ Send · Shift+↵ New line</span><span>·</span><span>🔒 Encrypted · Not stored</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
