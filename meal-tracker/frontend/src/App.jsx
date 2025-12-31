import { useState, useEffect } from "react";
import dayjs from "dayjs";

function App() {
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState([]);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [session, setSession] = useState(null);
  const [needConfirm, setNeedConfirm] = useState(null);

  const loadDashBoard = async () => {
    const res = await fetch("/api/meal/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    setSummary(data.todaySummary);
    setItems(data.items ?? []);
    setSession(data.session);
  };

  useEffect(() => {
    const saved = localStorage.getItem("logs");
    if (saved) setLogs(JSON.parse(saved));
    setLogsLoaded(true);
    loadDashBoard();
  }, []);

  useEffect(() => {
    if (!logsLoaded) return;
    localStorage.setItem("logs", JSON.stringify(logs));
  }, [logs, logsLoaded]);

  const sendPreset = async (presetText) => {
    const text = presetText.trim();
    if (!text) return;
    await sendText(text);
  };

  const sendText = async (text) => {
    const trimmed = (text ?? "").trim();
    if (!trimmed) return;

    // 새 메시지 보내면 기존 needConfirm은 닫음
    setNeedConfirm(null);

    setLogs((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");

    const res = await fetch("/api/meal/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: trimmed }),
    });

    if (!res.ok) {
      setLogs((prev) => [...prev, { role: "assistant", text: "서버 오류" }]);
      return;
    }

    const data = await res.json();
    console.log("data",data);

    // assistantText는 항상 출력
    if (data?.assistantText) {
      setLogs((prev) => [...prev, { role: "assistant", text: data.assistantText }]);
    }

    // summary/items는 NEED_CONFIRM이어도 같이 내려주니까 갱신해도 됨
    setSummary(data.todaySummary);
    setItems(data.items ?? []);

    // needConfirm 있으면 저장해서 UI에 버튼 띄움
    if (data.needConfirm) {
      setNeedConfirm(data.needConfirm);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    await sendText(text);
  };

  // 기록 시작/중단/재개 버튼 함수
  const startSession = async () => {
    await fetch("/api/meal/session/start", { method: "POST" });
    reloadSession();
  };

  const pauseSession = async () => {
    await fetch("/api/meal/session/end", { method: "POST" });
    reloadSession();
  };

  const resumeSession = async () => {
    await fetch("/api/meal/session/resume", { method: "POST" });
    reloadSession();
  };

  const reloadSession = async () => {
    const res = await fetch("/api/meal/today", { method: "POST" });
    const data = await res.json();
    setSession(data.session);
  };

  const isActive = session?.status === "ACTIVE";
  const isPaused = session?.status === "PAUSED";
  const isClosed = session?.status === "CLOSED";

  // needConfirm 버튼 핸들러들
  const handleChooseSuggestion = async (name, count) => {
    // 선택하면 confirm UI 닫고 재전송
    setNeedConfirm(null);
    await sendText(`${name} ${count}개`);
  };

  const handleEstimate = async (rawName, count) => {
    setNeedConfirm(null);
    // 그냥 원래 입력으로 다시 보내면 서버가 "추천 없음" 케이스에서 estimator로 처리하게 됨
    await sendText(`${rawName} ${count}개`);
  };

  return (
    <div style={{ padding: 40, maxWidth: 600 }}>
      <h1>Meal Tracker</h1>

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 10,
          padding: 12,
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: 700 }}>
          {session
            ? `${isActive ? "🟢" : isPaused ? "⏸" : "⚪"} ${session.statusText}`
            : "⚪ 기록 없음"}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button onClick={startSession} disabled={isActive} style={{ opacity: isActive ? 0.4 : 1 }}>
            기록 시작
          </button>

          <button onClick={pauseSession} disabled={!isActive} style={{ opacity: !isActive ? 0.4 : 1 }}>
            기록 중단
          </button>

          <button onClick={resumeSession} disabled={!isPaused} style={{ opacity: !isPaused ? 0.4 : 1 }}>
            기록 재개
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <h3 style={{ marginTop: 0 }}>오늘 먹은 것</h3>

          {summary && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 2fr 1fr 4fr",
                gap: 10,
                marginBottom: 12,
                padding: "8px 0",
                fontWeight: 700,
              }}
            >
              <div>오늘 합계</div>
              <div>-</div>
              <div>{Math.round(summary.totalCalories)} kcal</div>
              <div>{Math.round(summary.totalProtein)} g</div>
              <div>-</div>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 4fr",
              gap: 10,
              fontWeight: 700,
            }}
          >
            <div>음식</div>
            <div>수량</div>
            <div>칼로리</div>
            <div>단백질</div>
            <div>시간</div>
          </div>

          <div style={{ marginTop: 8 }}>
            {items.map((it, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 4fr",
                  gap: 10,
                  padding: "6px 0",
                  borderTop: "1px solid #eee",
                }}
              >
                <div>{it.name}</div>
                <div>x{it.count}</div>
                <div>{Math.round(it.calories)}</div>
                <div>{Math.round(it.protein)}</div>
                <div>{it.createdAt ? dayjs(it.createdAt).format("YYYY-MM-DD HH:mm") : "-"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* needConfirm UI */}
      {needConfirm && (
        <div
          style={{
            border: "1px solid #f0c36d",
            background: "#fff7e6",
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            ‘{needConfirm.rawName}’는 등록된 음식이 아니에요
          </div>

          {Array.isArray(needConfirm.suggestions) && needConfirm.suggestions.length > 0 ? (
            <>
              <div style={{ marginBottom: 10 }}>혹시 이거였나요?</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {needConfirm.suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleChooseSuggestion(s.name, needConfirm.count)}
                  >
                    {s.name} ({Math.round(s.protein)}g)
                  </button>
                ))}
                <button onClick={() => handleEstimate(needConfirm.rawName, needConfirm.count)}>
                  그냥 추정으로 기록
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 10 }}>추천 후보가 없어요</div>
              <button onClick={() => handleEstimate(needConfirm.rawName, needConfirm.count)}>
                그냥 추정으로 기록
              </button>
            </>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              send();
            }
          }}
          placeholder="ex: 오늘 식단 시작"
          style={{ flex: 1, padding: 8 }}
        />

        <button onClick={send}>전송</button>
      </div>

      <div style={{ marginTop: 20, whiteSpace: "pre-line" }}>
        {logs.map((log, idx) => (
          <div key={idx} style={{ marginBottom: 8 }}>
            <b>{log.role === "user" ? "나" : "GPT"}:</b>{" "}
            {log.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
