/* ================================================================
   Koro — Conversation Room app (React JSX)
   Single bundle: components + screens + dialogue scripts.
   ================================================================ */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ---------------- Lucide icon ---------------- */
function I({ name, size = 18, stroke = 1.6, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.innerHTML = "";
      const el = document.createElement("i");
      el.setAttribute("data-lucide", name);
      ref.current.appendChild(el);
      window.lucide.createIcons({
        attrs: { width: size, height: size, "stroke-width": stroke }
      });
    }
  }, [name, size, stroke]);
  return <span ref={ref} className={`kr-i ${className}`} style={{ display: "inline-flex" }} />;
}

/* ---------------- Furigana renderer ----------------
   tokens: array of [kanji, kana?] tuples, or strings
   ex: ["今日", ["話", "はな"], "しましょう"]
   We support a tagged template-like input format:
     parseFuri("今日は{何|なに}を{話|はな}しますか？")
*/
function parseFuri(text) {
  const out = [];
  const re = /\{([^|}]+)\|([^}]+)\}|([^\{]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1]) out.push({ k: m[1], r: m[2] });else
    out.push({ t: m[3] });
  }
  return out;
}
function Furi({ text }) {
  const tokens = useMemo(() => parseFuri(text), [text]);
  return (
    <>
      {tokens.map((tok, i) =>
      tok.k ?
      <ruby key={i}>{tok.k}<rt>{tok.r}</rt></ruby> :
      <span key={i}>{tok.t}</span>
      )}
    </>);

}

/* ---------------- Dialogue script (a thoughtful, runnable conversation) ---------------- */
/* Topic: ramen ordering. Realistic 8-turn flow. Furigana embedded with {kanji|reading}. */
const DIALOGUE = [
{
  from: "koro",
  text: "いらっしゃいませ！{何|なに}になさいますか？",
  plain: "いらっしゃいませ！何になさいますか？",
  vi: "Xin mời! Quý khách dùng gì ạ?",
  romaji: "Irasshaimase! Nani ni nasaimasu ka?",
  time: "14:02"
},
{
  from: "user",
  text: "{醤油|しょうゆ}ラーメンを{一|ひと}つお{願|ねが}いします。",
  plain: "醤油ラーメンを一つお願いします。",
  vi: "Cho tôi một bát mì shoyu.",
  romaji: "Shōyu rāmen o hitotsu onegai shimasu.",
  time: "14:02",
  pron: { score: 86, label: "Tốt", words: [
    { jp: "醤油", romaji: "shōyu", q: "good" },
    { jp: "ラーメン", romaji: "rāmen", q: "good" },
    { jp: "を", romaji: "o", q: "good" },
    { jp: "一つ", romaji: "hitotsu", q: "mid" },
    { jp: "お願い", romaji: "onegai", q: "good" },
    { jp: "します", romaji: "shimasu", q: "good" }]
  },
  duration: 3.4
},
{
  from: "koro",
  text: "かしこまりました。トッピングはいかがですか？",
  plain: "かしこまりました。トッピングはいかがですか？",
  vi: "Vâng. Quý khách có muốn thêm topping không?",
  romaji: "Kashikomarimashita. Toppingu wa ikaga desu ka?",
  time: "14:03"
},
{
  from: "user",
  text: "{煮卵|にたまご}と{海苔|のり}くださいませ。",
  plain: "煮卵と海苔くださいませ。",
  vi: "Cho tôi trứng luộc và rong biển ạ.",
  romaji: "Nitamago to nori kudasaimase.",
  time: "14:03",
  pron: { score: 72, label: "Khá ổn", words: [
    { jp: "煮卵", romaji: "nitamago", q: "good" },
    { jp: "と", romaji: "to", q: "good" },
    { jp: "海苔", romaji: "nori", q: "mid" },
    { jp: "くださいませ", romaji: "kudasaimase", q: "bad" }]
  },
  correction: {
    original: "煮卵と海苔くださいませ。",
    fixed: "煮卵と海苔をください。",
    diffJp: [
    { ins: "煮卵と海苔" }, { ins: "を" }, { ins: "ください" },
    { del: "ませ" }, { ins: "。" }],

    explainVi: "「ください」đã đủ lịch sự ở quán ăn. Thêm 「ませ」khiến câu nghe quá trang trọng và hơi gượng. Cũng nhớ thêm trợ từ「を」trước 「ください」.",
    ruleId: "te-form"
  },
  duration: 2.9
},
{
  from: "koro",
  text: "{承知|しょうち}いたしました。{少々|しょうしょう}お{待|ま}ちください。",
  plain: "承知いたしました。少々お待ちください。",
  vi: "Vâng đã hiểu. Xin vui lòng đợi một chút.",
  romaji: "Shōchi itashimashita. Shōshō omachi kudasai.",
  time: "14:04"
}];


/* Grammar rule attached to the correction in DIALOGUE[3] */
const RULE_TE_FORM = {
  id: "kudasai",
  vi: "「〜をください」 — khi gọi món ở quán ăn",
  jp: "〜をください",
  pattern: { prefix: "danh từ", slot: "を", suffix: "ください" },
  examples: [
  { jp: "{水|みず}をください。", vi: "Cho tôi nước." },
  { jp: "メニューをください。", vi: "Cho tôi xem menu." },
  { jp: "{箸|はし}をもう{一膳|いちぜん}ください。", vi: "Cho tôi xin thêm một đôi đũa." }],

  note: "「ください」là cách lịch sự thông thường. 「くださいませ」 dùng trong tình huống phục vụ rất trang trọng (khách sạn cao cấp, lễ tân) — không phù hợp khi gọi món."
};

/* Suggested replies user can pick instead of speaking */
const IDEAS = [
{ jp: "{餃子|ぎょうざ}も{一皿|ひとさら}ください。", vi: "Cho tôi thêm một đĩa gyoza." },
{ jp: "{辛|から}さは{普通|ふつう}でお{願|ねが}いします。", vi: "Độ cay vừa phải, cảm ơn." },
{ jp: "{お会計|おかいけい}はあとで。", vi: "Thanh toán sau cũng được." }];


/* ---------------- Score ring ---------------- */
function ScoreRing({ score }) {
  const C = 2 * Math.PI * 36;
  const off = C * (1 - score / 100);
  const cls = score >= 80 ? "good" : score >= 65 ? "mid" : "bad";
  return (
    <div className="kr-score-ring">
      <svg viewBox="0 0 88 88">
        <circle className="track" cx="44" cy="44" r="36" strokeWidth="6" />
        <circle className={`arc ${cls}`} cx="44" cy="44" r="36" strokeWidth="6"
        strokeDasharray={C} strokeDashoffset={off} />
      </svg>
      <div className="kr-score-num">
        <strong>{score}</strong>
        <span>điểm</span>
      </div>
    </div>);

}

/* ---------------- Pitch contour SVG ---------------- */
function PitchCompare() {
  // Native (target) and you (slightly off) pitch lines
  const native = "M2,38 C20,18 38,40 60,32 C82,24 110,42 138,30 C168,18 196,38 218,28";
  const you = "M2,42 C22,30 40,42 60,38 C84,36 108,46 138,40 C170,32 198,44 218,38";
  return (
    <svg className="kr-pitch-svg" viewBox="0 0 220 64">
      {/* baseline */}
      <line x1="0" x2="220" y1="50" y2="50" stroke="currentColor" strokeOpacity="0.08" />
      <line x1="0" x2="220" y1="32" y2="32" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="2 4" />
      <path d={native} fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d={you} fill="none" stroke="var(--info)" strokeWidth="2" />
    </svg>);

}

/* ---------------- Mini waveform (replay) ---------------- */
function MiniWave({ seed = 0, count = 48 }) {
  const heights = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      // pseudo-random envelope
      const t = (i + seed * 7) * 0.31;
      const env = Math.sin(i / count * Math.PI);
      const h = 4 + Math.abs(Math.sin(t) * 0.6 + Math.cos(t * 1.3) * 0.4) * 18 * env;
      arr.push(h.toFixed(1));
    }
    return arr;
  }, [seed, count]);
  return (
    <div className="kr-replay-mini-wave">
      {heights.map((h, i) => <i key={i} style={{ height: h + "px" }} />)}
    </div>);

}

/* ---------------- Live waveform (recording) ---------------- */
function LiveWave({ count = 14 }) {
  return (
    <div className="kr-wave" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) =>
      <i key={i} style={{ animationDelay: `${i % 7 * 80}ms` }} />
      )}
    </div>);

}

/* ---------------- Bubble ---------------- */
function Bubble({ msg, idx, onSave, isSaved, settings, onSelectMsg, isSelected, onPlay, onShowCorrection }) {
  const isUser = msg.from === "user";
  const furiMode = !settings.furiganaForce ?
  settings.furiganaByLevel :
  settings.furiganaForce; // off|on|hover
  const transOn = settings.translationMode === "always";
  const [translateOpen, setTranslateOpen] = useState(transOn);
  useEffect(() => {setTranslateOpen(transOn);}, [transOn]);

  return (
    <div className={`kr-turn ${isUser ? "is-user" : "is-koro"}`}>
      <div className={`kr-avatar ${isUser ? "is-user" : ""}`}>
        {isUser ? <span>M</span> : <img src={(window.__resources && window.__resources.mascot) || "assets/mascot.svg"} alt="Koro" />}
      </div>
      <div className="kr-bubble-wrap">
        <div className="kr-meta">
          <strong>{isUser ? "Bạn" : "Koro"}</strong>
          <span>·</span>
          <span>{msg.time}</span>
          {msg.pron && <>
            <span>·</span>
            <span style={{ color: msg.pron.score >= 80 ? "var(--primary)" : msg.pron.score >= 65 ? "#C18A2D" : "var(--accent)" }}>
              {msg.pron.score}/100
            </span>
          </>}
          {msg.correction &&
          <button className="kr-actbtn is-on" onClick={() => onShowCorrection(idx)} style={{ opacity: 1 }}>
              <I name="alert-circle" size={12} /> Koro gợi ý sửa
            </button>
          }
        </div>

        <div
          className={`kr-bubble ${isUser ? "is-user" : "is-koro"}`}
          data-furigana={furiMode}
          onClick={() => isUser && msg.pron ? onSelectMsg(idx) : null}
          style={{ cursor: isUser && msg.pron ? "pointer" : "default" }}>
          
          {isUser && msg.pron ?
          <span style={{ display: "inline" }}>
              {msg.pron.words.map((w, wi) =>
            <span key={wi} className={`pron-${w.q}`} style={{ display: "inline", marginRight: 1 }}>
                  {w.jp}
                </span>
            )}
            </span> :

          <Furi text={msg.text} />
          }
        </div>

        {settings.romaji && msg.romaji &&
        <div className="kr-romaji">{msg.romaji}</div>
        }

        {!isUser &&
        <>
            <button className="kr-translate-toggle" onClick={() => setTranslateOpen((o) => !o)}>
              <I name={translateOpen ? "chevron-up" : "languages"} size={12} />
              {translateOpen ? "Ẩn bản dịch" : "Hiện bản dịch"}
            </button>
            {translateOpen && <div className="kr-translate">{msg.vi}</div>}
          </>
        }
        {isUser && translateOpen &&
        <div className="kr-translate">{msg.vi}</div>
        }

        <div className="kr-actions">
          <button className="kr-actbtn" onClick={() => onPlay(idx)}>
            <I name="play" size={12} /> {msg.duration ? `${msg.duration.toFixed(1)}s` : "Phát"}
          </button>
          {!isUser &&
          <button className={`kr-actbtn ${isSaved ? "is-on" : ""}`} onClick={() => onSave(idx)}>
              <I name={isSaved ? "check" : "bookmark-plus"} size={12} />
              {isSaved ? "Đã lưu" : "Lưu vào sổ tay"}
            </button>
          }
          <button className="kr-actbtn">
            <I name="copy" size={12} />
          </button>
          {isUser && msg.pron &&
          <button className="kr-actbtn" onClick={() => onSelectMsg(idx)}>
              <I name="bar-chart-3" size={12} /> Phát âm
            </button>
          }
        </div>
      </div>
    </div>);

}

/* ---------------- Pronunciation panel ---------------- */
function PronunciationPanel({ msg, idx, onClose }) {
  if (!msg || !msg.pron) {
    return (
      <div className="kr-vocab-empty" style={{ paddingTop: 80 }}>
        <I name="bar-chart-3" size={28} />
        <p style={{ marginTop: 16 }}>Hãy nói một câu để xem điểm phát âm.</p>
        <p style={{ fontSize: 11, marginTop: 6, opacity: 0.6 }}>押して話してみてください。</p>
      </div>);

  }
  const p = msg.pron;
  const tipBy = p.score >= 85 ?
  "Phát âm rất rõ. Có thể giữ nhịp này." :
  p.score >= 70 ?
  "Vẫn nghe được, nhưng vài âm cuối kéo dài. Thử ngắt rõ hơn." :
  "Vài từ còn nuốt âm. Nghe lại Koro và lặp theo nhịp.";
  return (
    <>
      <div className="kr-pron-head">
        <h3>
          <I name="bar-chart-3" size={14} /> Phân tích phát âm
          <span className="jp">発音</span>
        </h3>
        <span className="kr-pron-time">{msg.time}</span>
      </div>

      <div className="kr-score">
        <ScoreRing score={p.score} />
        <div className="kr-score-body">
          <strong>{p.label}</strong>
          <div className="jp">スコア · {p.score}/100</div>
          <p>{tipBy}</p>
        </div>
      </div>

      <div className="kr-side-section-head">
        <strong>Đường nét cao độ</strong>
        <span className="jp">ピッチ</span>
      </div>
      <div className="kr-pitch">
        <div className="kr-pitch-head">
          <strong>Bạn vs. Koro</strong>
          <span>あなた / コロ</span>
        </div>
        <PitchCompare />
        <div className="kr-pitch-legend">
          <span className="you"><i></i>Bạn</span>
          <span className="koro"><i></i>Koro (chuẩn)</span>
        </div>
      </div>

      <div className="kr-side-section-head">
        <strong>Theo từng từ</strong>
        <span className="jp">単語別</span>
      </div>
      <div className="kr-words">
        {p.words.map((w, i) =>
        <span key={i} className={`kr-word ${w.q}`} title={w.romaji}>
            {w.jp}
            <small>{w.romaji}</small>
          </span>
        )}
      </div>

      <div className="kr-side-section-head">
        <strong>Phát lại</strong>
        <span className="jp">再生</span>
      </div>
      <div className="kr-replay" style={{ marginBottom: 10 }}>
        <button className="kr-replay-btn" aria-label="Phát giọng bạn"><I name="play" size={14} stroke={2} /></button>
        <MiniWave seed={1} />
        <span className="kr-replay-label">Bạn · {msg.duration?.toFixed(1)}s</span>
      </div>
      <div className="kr-replay">
        <button className="kr-replay-btn" style={{ background: "var(--bg-sunken)", color: "var(--fg-muted)" }} aria-label="Phát giọng Koro"><I name="play" size={14} stroke={2} /></button>
        <MiniWave seed={4} />
        <span className="kr-replay-label">Koro · 3.0s</span>
      </div>
    </>);

}

/* ---------------- Correction panel ---------------- */
function CorrectionPanel({ msg, onClose, ruleOpen, setRuleOpen }) {
  if (!msg || !msg.correction) {
    return (
      <div className="kr-vocab-empty" style={{ paddingTop: 80 }}>
        <I name="check-circle-2" size={28} />
        <p style={{ marginTop: 16 }}>Chưa có điểm nào cần sửa. Khi Koro thấy chỗ có thể nói tự nhiên hơn, gợi ý sẽ hiện ở đây.</p>
      </div>);

  }
  const c = msg.correction;
  return (
    <>
      <div className="kr-pron-head">
        <h3>
          <I name="alert-circle" size={14} /> Koro gợi ý
          <span className="jp">提案</span>
        </h3>
        <span className="kr-pron-time">{msg.time}</span>
      </div>

      <div className="kr-correct">
        <div className="kr-correct-head">
          <img src={(window.__resources && window.__resources.mascot) || "assets/mascot.svg"} alt="" />
          <strong>Một cách nói tự nhiên hơn</strong>
        </div>
        <div className="kr-diff">
          <div style={{ marginBottom: 8, opacity: 0.7 }}>
            <span style={{ fontSize: 11, color: "var(--fg-faint)", letterSpacing: "0.06em", textTransform: "uppercase", marginRight: 8 }}>Bạn nói</span>
            {c.original}
          </div>
          <div>
            <span style={{ fontSize: 11, color: "var(--primary)", letterSpacing: "0.06em", textTransform: "uppercase", marginRight: 8 }}>Tự nhiên hơn</span>
            <span style={{ color: "var(--primary)", fontWeight: 500 }}>{c.fixed}</span>
          </div>
        </div>
        <div className="kr-correct-explain">
          {c.explainVi}
        </div>
        <button className="kr-rule-link" onClick={() => setRuleOpen((o) => !o)}>
          <I name="book-open" size={12} />
          Xem mẫu câu
          <span className="jp">「{RULE_TE_FORM.jp}」</span>
          <I name={ruleOpen ? "chevron-up" : "chevron-down"} size={12} />
        </button>
      </div>

      {ruleOpen &&
      <div className="kr-rule-sheet">
          <h4>
            <span>{RULE_TE_FORM.vi}</span>
            <span style={{ fontFamily: "var(--font-jp)", color: "var(--fg-faint)", fontSize: 11 }}>{RULE_TE_FORM.jp}</span>
          </h4>
          <div className="pat">
            <span style={{ color: "var(--fg-subtle)" }}>{RULE_TE_FORM.pattern.prefix}</span>
            <span className="slot">{RULE_TE_FORM.pattern.slot}</span>
            <span>{RULE_TE_FORM.pattern.suffix}</span>
          </div>
          <ul>
            {RULE_TE_FORM.examples.map((ex, i) =>
          <li key={i}>
                <span className="ex-jp"><Furi text={ex.jp} /></span>
                <span className="ex-vi">{ex.vi}</span>
              </li>
          )}
          </ul>
          <div style={{ marginTop: 12, padding: 10, background: "var(--bg-sunken)", borderRadius: 8, fontSize: 12, lineHeight: 1.5, color: "var(--fg-muted)" }}>
            <strong style={{ color: "var(--fg)" }}>Ghi chú · </strong>{RULE_TE_FORM.note}
          </div>
        </div>
      }
    </>);

}

/* ---------------- Vocab panel ---------------- */
function VocabPanel({ items, onRemove }) {
  if (items.length === 0) {
    return (
      <div className="kr-vocab-empty">
        <img src={(window.__resources && window.__resources.mascot) || "assets/mascot.svg"} alt="" />
        <p>Sổ tay còn trống.</p>
        <p style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>Hãy thử lưu một câu Koro vừa nói — bạn có thể ôn lại sau.</p>
      </div>);

  }
  return (
    <>
      <div className="kr-side-section-head">
        <strong>{items.length} câu đã lưu</strong>
        <span className="jp" style={{ color: "var(--fg-faint)", fontSize: 11 }}>ノート</span>
      </div>
      {items.map((it, i) =>
      <div className="kr-vocab" key={i}>
          <div className="kr-vocab-jp"><Furi text={it.text} /></div>
          <div className="kr-vocab-vi">{it.vi}</div>
          <div className="kr-vocab-foot">
            <span className="kr-vocab-due is-due">
              <I name="repeat-2" size={11} /> Ôn hôm nay
            </span>
            <button className="kr-actbtn" onClick={() => onRemove(i)} style={{ opacity: 1 }}>
              <I name="trash-2" size={11} />
            </button>
          </div>
        </div>
      )}
    </>);

}

/* ---------------- Main app ---------------- */
const DEFAULT_TWEAKS = /*EDITMODE-BEGIN*/{
  "theme": "washi",
  "level": "beginner",
  "textSize": "m",
  "furiganaForce": "",
  "translationMode": "tap",
  "speechSpeed": 1.0,
  "romaji": false,
  "density": "cozy"
} /*EDITMODE-END*/;

function App() {
  // tweaks
  const [tweaks, _setTweaks] = useState(() => {
    try {const s = localStorage.getItem("koro:tweaks");if (s) return { ...DEFAULT_TWEAKS, ...JSON.parse(s) };} catch (e) {}
    return DEFAULT_TWEAKS;
  });
  const setTweak = (k, v) => {
    let next;
    if (typeof k === "object") next = { ...tweaks, ...k };else
    next = { ...tweaks, [k]: v };
    _setTweaks(next);
    try {localStorage.setItem("koro:tweaks", JSON.stringify(next));} catch (e) {}
    try {window.parent.postMessage({ type: "__edit_mode_set_keys", edits: typeof k === "object" ? k : { [k]: v } }, "*");} catch (e) {}
  };
  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
  }, [tweaks.theme]);

  // furigana effective mode (level→mode unless force is set)
  const settings = useMemo(() => {
    const byLevel = tweaks.level === "beginner" ? "on" :
    tweaks.level === "intermediate" ? "hover" :
    "off";
    return {
      ...tweaks,
      furiganaByLevel: tweaks.furiganaForce || byLevel
    };
  }, [tweaks]);

  // dialogue state
  const [messages, setMessages] = useState([DIALOGUE[0], DIALOGUE[1], DIALOGUE[2], DIALOGUE[3]]);
  const [scriptIdx, setScriptIdx] = useState(4); // next msg from DIALOGUE
  const [micState, setMicState] = useState("idle"); // idle | recording | thinking
  const [savedIdx, setSavedIdx] = useState([2]); // pre-saved one for demo
  const [vocab, setVocab] = useState([
  { text: DIALOGUE[2].text, vi: DIALOGUE[2].vi, time: DIALOGUE[2].time }]
  );

  // panel state
  const [sideTab, setSideTab] = useState("correction"); // correction | pronunciation | vocab
  const [selectedMsg, setSelectedMsg] = useState(3); // pre-select user msg with correction for demo
  const [ruleOpen, setRuleOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const transcriptRef = useRef(null);
  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [messages, micState]);

  // session timer
  const [tSec, setTSec] = useState(7 * 60 + 22);
  useEffect(() => {
    const id = setInterval(() => setTSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const tStr = `${Math.floor(tSec / 60)}:${String(tSec % 60).padStart(2, "0")}`;

  /* mic actions */
  const handleMicClick = () => {
    if (micState === "idle") {
      setMicState("recording");
      // simulate 2s recording
      setTimeout(() => {
        setMicState("thinking");
        setTimeout(() => {
          // append next user message + Koro reply if available
          const nextUser = DIALOGUE[scriptIdx];
          if (nextUser) {
            setMessages((m) => [...m, nextUser]);
            setSelectedMsg(messages.length); // index of new user msg
            if (nextUser.correction) {
              setShowToast(true);
              setTimeout(() => setShowToast(false), 3500);
              setSideTab("correction");
            } else if (nextUser.pron) {
              setSideTab("pronunciation");
            }
            setScriptIdx((i) => i + 1);
            const nextKoro = DIALOGUE[scriptIdx + 1];
            if (nextKoro) {
              setTimeout(() => {
                setMessages((m) => [...m, nextKoro]);
                setScriptIdx((i) => i + 1);
                setMicState("idle");
              }, 700);
            } else {
              setMicState("idle");
            }
          } else {
            setMicState("idle");
          }
        }, 1100);
      }, 2200);
    } else if (micState === "recording") {
      setMicState("idle");
    }
  };

  const handleSave = (idx) => {
    if (savedIdx.includes(idx)) {
      setSavedIdx((s) => s.filter((x) => x !== idx));
      setVocab((v) => v.filter((x) => x.text !== messages[idx].text));
    } else {
      setSavedIdx((s) => [...s, idx]);
      setVocab((v) => [{ text: messages[idx].text, vi: messages[idx].vi, time: messages[idx].time }, ...v]);
      setSideTab("vocab");
    }
  };

  const handleSelectMsg = (idx) => {
    setSelectedMsg(idx);
    if (messages[idx]?.correction) setSideTab("correction");else
    if (messages[idx]?.pron) setSideTab("pronunciation");
  };

  const selMsg = messages[selectedMsg];
  const correctionCount = messages.filter((m) => m.correction).length;

  return (
    <div
      className="kr-app"
      data-density={tweaks.density}
      data-text-size={tweaks.textSize}>
      
      {/* Top bar */}
      <header className="kr-topbar">
        <div className="kr-topbar-left">
          <a className="kr-brand" href="#">
            <img src={(window.__resources && window.__resources.logomark) || "assets/logomark.svg"} alt="" />
            <span>koro</span>
            <span className="kr-brand-jp">コロ</span>
          </a>
          <div className="kr-crumb">
            <span>Đang luyện</span>
            <span style={{ color: "var(--fg-faint)" }}>·</span>
            <strong>Gọi món ở quán mì</strong>
            <span style={{ fontFamily: "var(--font-jp)", color: "var(--fg-faint)" }}>ラーメン</span>
          </div>
        </div>
        <div className="kr-topbar-right">
          <span className="kr-timer">
            <span className="kr-timer-dot"></span>
            {tStr} · luyện
          </span>
          {/* level dial */}
          <div className="kr-level" role="tablist">
            {[
            { id: "beginner", vi: "Sơ cấp", jp: "初級" },
            { id: "intermediate", vi: "Trung cấp", jp: "中級" },
            { id: "advanced", vi: "Cao cấp", jp: "上級" }].
            map((l) =>
            <button key={l.id}
            className={`kr-level-btn ${tweaks.level === l.id ? "is-on" : ""}`}
            onClick={() => setTweak("level", l.id)}>
                {l.vi}<span className="jp">{l.jp}</span>
              </button>
            )}
          </div>
          <button className="kr-iconbtn" title="Cài đặt giọng">
            <I name="volume-2" />
          </button>
          <button className="kr-iconbtn" title="Xuất hội thoại">
            <I name="download" />
          </button>
          <button className="kr-iconbtn" title="Kết thúc" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
            <I name="x" />
          </button>
        </div>
      </header>

      {/* Side rail */}
      <aside className="kr-rail">
        <button className="kr-rail-btn is-active" title="Hội thoại"><I name="messages-square" size={18} /></button>
        <button className="kr-rail-btn" title="Sổ tay"><I name="bookmark" size={18} /></button>
        <button className="kr-rail-btn" title="Lịch sử"><I name="history" size={18} /></button>
        <button className="kr-rail-btn" title="Ôn tập"><I name="repeat-2" size={18} /></button>
        <div className="kr-rail-divider"></div>
        <button className="kr-rail-btn" title="Cài đặt"><I name="settings" size={18} /></button>
        <div className="kr-rail-spacer"></div>
        <button className="kr-rail-btn" title="Hồ sơ"><I name="user" size={18} /></button>
      </aside>

      {/* Main */}
      <main className="kr-main">
        <div className="kr-bg-bamboo"><img src={(window.__resources && window.__resources.bamboo) || "assets/bamboo.svg"} alt="" /></div>

        <div className="kr-main-head">
          <div className="kr-main-head-left">
            <div>
              <div className="kr-eyebrow">
                <span className="kr-eyebrow-dot"></span>
                Phòng trò chuyện · 会話ルーム
              </div>
              <div className="kr-topic-title">Gọi món ở quán mì</div>
              <div className="kr-topic-jp">「<Furi text="ラーメン{屋|や}で{注文|ちゅうもん}する" />」 · {messages.length} lượt nói · {tStr}</div>
            </div>
          </div>
          <div className="kr-main-head-right">
            <button
              className={`kr-iconbtn ${tweaks.translationMode === "always" ? "is-on" : ""}`}
              title="Bản dịch"
              onClick={() => setTweak("translationMode", tweaks.translationMode === "always" ? "tap" : "always")}>
              <I name="languages" />
            </button>
            <button
              className={`kr-iconbtn ${tweaks.romaji ? "is-on" : ""}`}
              title="Romaji"
              onClick={() => setTweak("romaji", !tweaks.romaji)}>
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)" }}>aA</span>
            </button>
            <button className="kr-iconbtn" title="Tăng cỡ chữ"
            onClick={() => {
              const order = ["s", "m", "l", "xl"];
              const i = order.indexOf(tweaks.textSize);
              setTweak("textSize", order[(i + 1) % order.length]);
            }}>
              <I name="type" />
            </button>
          </div>
        </div>

        <div className="kr-transcript" ref={transcriptRef}>
          <div className="kr-transcript-inner">
            <div className="kr-day">Hôm nay · 14:01</div>
            {messages.map((m, i) =>
            <Bubble
              key={i}
              msg={m}
              idx={i}
              onSave={handleSave}
              isSaved={savedIdx.includes(i)}
              settings={settings}
              onSelectMsg={handleSelectMsg}
              isSelected={selectedMsg === i}
              onPlay={() => {}}
              onShowCorrection={(j) => {setSelectedMsg(j);setSideTab("correction");}} />

            )}
            {micState === "thinking" &&
            <div className="kr-turn is-koro">
                <div className="kr-avatar"><img src={(window.__resources && window.__resources.mascot) || "assets/mascot.svg"} alt="" /></div>
                <div className="kr-bubble-wrap">
                  <div className="kr-meta"><strong>Koro</strong><span>·</span><span>đang nghĩ…</span></div>
                  <div className="kr-thinking"><i></i><i></i><i></i></div>
                </div>
              </div>
            }
          </div>
        </div>

        {/* toast */}
        {showToast &&
        <div className="kr-toast">
            <img src={(window.__resources && window.__resources.mascot) || "assets/mascot.svg"} alt="" />
            <div>
              <strong>Koro có một gợi ý</strong>
              <span className="jp">提案があります</span>
            </div>
            <button className="kr-iconbtn" style={{ width: 28, height: 28 }} onClick={() => setShowToast(false)}>
              <I name="x" size={14} />
            </button>
          </div>
        }

        {/* composer */}
        <div className="kr-composer">
          <div className="kr-ideas">
            <div className="kr-ideas-label"><I name="sparkles" size={11} /> Gợi ý</div>
            <div className="kr-ideas-row">
              {IDEAS.map((idea, i) =>
              <button className="kr-idea" key={i} onClick={() => {/* TODO send */}}>
                  <div className="kr-idea-jp"><Furi text={idea.jp} /></div>
                  <div className="kr-idea-vi">{idea.vi}</div>
                </button>
              )}
            </div>
          </div>
          <div className="kr-mic-row">
            <div className="kr-mic-side left">
              <div className="kr-keyboard">
                <I name="keyboard" size={14} /> Hoặc gõ phím <span className="kr-kbd">⌘ K</span>
              </div>
            </div>
            <div style={{ position: "relative" }}>
              <button className={`kr-mic ${micState === "recording" ? "is-recording" : ""} ${micState === "thinking" ? "is-thinking" : ""}`}
              onClick={handleMicClick} aria-label="Nhấn để nói">
                <I name={micState === "recording" ? "square" : micState === "thinking" ? "loader" : "mic"} size={32} stroke={1.6} />
              </button>
              {micState === "recording" &&
              <div className="kr-mic-rings"><i></i><i></i><i></i></div>
              }
            </div>
            <div className="kr-mic-side right">
              {micState === "recording" ?
              <LiveWave /> :

              <div className="kr-mic-status">
                  {micState === "idle" && <>
                    <span>Nhấn để nói</span>
                    <span className="jp">押して話す</span>
                  </>}
                  {micState === "thinking" && <>
                    <span>Koro đang nghĩ…</span>
                    <span className="jp">考えています</span>
                  </>}
                </div>
              }
            </div>
          </div>
        </div>
      </main>

      {/* Side panel */}
      <aside className="kr-side">
        <div className="kr-side-tabs">
          <button className={`kr-side-tab ${sideTab === "correction" ? "is-on" : ""}`} onClick={() => setSideTab("correction")}>
            <I name="alert-circle" size={14} /> Gợi ý
            {correctionCount > 0 && <span className="badge">{correctionCount}</span>}
          </button>
          <button className={`kr-side-tab ${sideTab === "pronunciation" ? "is-on" : ""}`} onClick={() => setSideTab("pronunciation")}>
            <I name="bar-chart-3" size={14} /> Phát âm
          </button>
          <button className={`kr-side-tab ${sideTab === "vocab" ? "is-on" : ""}`} onClick={() => setSideTab("vocab")}>
            <I name="bookmark" size={14} /> Sổ tay
            {vocab.length > 0 && <span className="badge">{vocab.length}</span>}
          </button>
        </div>
        <div className="kr-side-body">
          {sideTab === "correction" && <CorrectionPanel msg={selMsg} ruleOpen={ruleOpen} setRuleOpen={setRuleOpen} />}
          {sideTab === "pronunciation" && <PronunciationPanel msg={selMsg} />}
          {sideTab === "vocab" && <VocabPanel items={vocab} onRemove={(i) => setVocab((v) => v.filter((_, j) => j !== i))} />}
        </div>
      </aside>

      <KoroTweaks tweaks={tweaks} setTweak={setTweak} />
    </div>);

}

/* ---------------- Tweaks panel (uses starter) ---------------- */
function KoroTweaks({ tweaks, setTweak }) {
  return (
    <TweaksPanel title="Tweaks · 調整">
      <TweakSection title="Theme">
        <TweakRadio label="Chế độ" options={[
        { value: "washi", label: "Washi" },
        { value: "light", label: "Sáng" },
        { value: "sumi", label: "Sumi" }]
        } value={tweaks.theme} onChange={(v) => setTweak("theme", v)} />
      </TweakSection>

      <TweakSection title="Đọc" subtitle="Furigana, romaji, dịch">
        <TweakRadio label="Cỡ chữ" options={[
        { value: "s", label: "S" },
        { value: "m", label: "M" },
        { value: "l", label: "L" },
        { value: "xl", label: "XL" }]
        } value={tweaks.textSize} onChange={(v) => setTweak("textSize", v)} />
        <TweakSelect label="Furigana" value={tweaks.furiganaForce} onChange={(v) => setTweak("furiganaForce", v)}
        options={[
        { value: "", label: "Tự động (theo trình độ)" },
        { value: "on", label: "Luôn hiện" },
        { value: "hover", label: "Khi rê chuột" },
        { value: "off", label: "Tắt" }]
        } />
        <TweakRadio label="Bản dịch" options={[
        { value: "tap", label: "Khi nhấn" },
        { value: "always", label: "Luôn hiện" }]
        } value={tweaks.translationMode} onChange={(v) => setTweak("translationMode", v)} />
        <TweakToggle label="Romaji" checked={tweaks.romaji} onChange={(v) => setTweak("romaji", v)} />
      </TweakSection>

      <TweakSection title="Giọng nói">
        <TweakSlider label="Tốc độ Koro" min={0.6} max={1.4} step={0.05} value={tweaks.speechSpeed}
        onChange={(v) => setTweak("speechSpeed", v)} format={(v) => `${v.toFixed(2)}×`} />
      </TweakSection>

      <TweakSection title="Mật độ">
        <TweakRadio label="Khoảng cách" options={[
        { value: "cozy", label: "Thoải mái" },
        { value: "compact", label: "Gọn" }]
        } value={tweaks.density} onChange={(v) => setTweak("density", v)} />
      </TweakSection>
    </TweaksPanel>);

}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);