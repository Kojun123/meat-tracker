import { useState, useEffect } from "react";
import dayjs from "dayjs";
import ManualModal from "./components/ManualModal";
import { useNavigate } from "react-router-dom";


function Dashboard() {
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState([]);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [session, setSession] = useState(null);
  const [needConfirm, setNeedConfirm] = useState(null);

  const navigate = useNavigate();


  //직접 기록
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({rawName:"", count:1, protein:"", kcal:""});

  const loadDashBoard = async () => {
    const res = await fetch("/api/meal/today", {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if(res.status === 401) {
      navigate("/login");
      return;
    }

    const data = await res.json();
    setSummary(data.todaySummary);
    setItems(data.items ?? []);
    setSession(data.session);
  };

useEffect(() => {
  (async () => {
    const me = await fetch("/auth/me", { credentials: "include" });
    if (me.status === 401) {
      navigate("/login");
      return;
    }

    const saved = localStorage.getItem("logs");
    if (saved) setLogs(JSON.parse(saved));
    setLogsLoaded(true);
    loadDashBoard();
  })();
}, []);


  useEffect(() => {
    if (!logsLoaded) return;
    localStorage.setItem("logs", JSON.stringify(logs));
  }, [logs, logsLoaded]); 

  const sendText = async (text) => {
    const trimmed = (text ?? "").trim();
    if (!trimmed) return;

    // 새 메시지 보내면 기존 needConfirm은 닫음
    setNeedConfirm(null);

    setLogs((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");

    const res = await fetch("/api/meal/message", {
      method: "POST",
      credentials: "include",
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
    await fetch("/api/meal/session/start", { method: "POST", credentials: "include" });
    reloadSession();
  };

  const pauseSession = async () => {
    await fetch("/api/meal/session/end", { method: "POST", credentials: "include" });
    reloadSession();
  };

  const resumeSession = async () => {
    await fetch("/api/meal/session/resume", { method: "POST", credentials: "include" });
    reloadSession();
  };

  const reloadSession = async () => {
    const res = await fetch("/api/meal/today", { method: "POST", credentials: "include" });
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

  const openManual = (rawName, count) => {
    setManual({rawName, count, protein:"", kcal:""});
    setManualOpen(true);
  };

  const submitManual = async() => {
    const protein = Number(manual.protein);
    const kcal = Number(manual.kcal);

    if(!Number.isFinite(protein) || protein < 0) return;
    if(!Number.isFinite(kcal) || kcal < 0) return;

    setNeedConfirm(null);
    setManualOpen(false);

    await fetch("/api/meal/manual", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        sessionId: session?.id,
        rawName: manual.rawName,
        count: manual.count,
        protein,
        kcal
      })
    }).then(r=>r.json()).then(handleServerResponse);    
  };

  function handleServerResponse(res) {
    setLogs((prev) => [...prev, { role: "assistant", text: res.assistantText }]);
    setSummary(res.todaySummary);
    setItems(res.items ?? []);
  }

  return (
  <div className="min-h-screen bg-gray-50">
    <ManualModal
      open={manualOpen}
      manual={manual}
      setManual={setManual}
      onClose={() => setManualOpen(false)}
      onSubmit={submitManual}
    />

    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Meal Tracker</h1>
          <p className="mt-1 text-sm text-gray-500">먹은 거 대충 던지면 기록해주는 착한 척 하는 앱</p>
        </div>

        {/* 나중에 /auth/me에서 email 받아오면 넣기 */}
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              await fetch("/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
              navigate("/login");
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* Session bar */}
      <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span
              className={[
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium border",
                isActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : isPaused
                  ? "bg-amber-50 text-amber-700 border-amber-100"
                  : "bg-gray-50 text-gray-700 border-gray-200",
              ].join(" ")}
            >
              <span
                className={[
                  "h-2 w-2 rounded-full",
                  isActive ? "bg-emerald-500" : isPaused ? "bg-amber-500" : "bg-gray-400",
                ].join(" ")}
              />
              {session ? session.statusText : "기록 없음"}
            </span>

            {session?.updatedAt && (
              <span className="text-sm text-gray-500">
                {dayjs(session.updatedAt).format("YYYY-MM-DD HH:mm")}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={startSession}
              disabled={isActive}
              className={[
                "rounded-xl px-4 py-2 text-sm font-semibold",
                isActive
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-900 text-white hover:bg-gray-800",
              ].join(" ")}
            >
              기록 시작
            </button>

            <button
              onClick={pauseSession}
              disabled={!isActive}
              className={[
                "rounded-xl px-4 py-2 text-sm font-semibold",
                !isActive
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50",
              ].join(" ")}
            >
              기록 중단
            </button>

            <button
              onClick={resumeSession}
              disabled={!isPaused}
              className={[
                "rounded-xl px-4 py-2 text-sm font-semibold",
                !isPaused
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50",
              ].join(" ")}
            >
              기록 재개
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">칼로리</div>
          <div className="mt-1 text-3xl font-semibold text-gray-900">
            {summary ? Math.round(summary.totalCalories) : 0}
            <span className="ml-2 text-base font-medium text-gray-500">kcal</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">단백질</div>
          <div className="mt-1 text-3xl font-semibold text-gray-900">
            {summary ? Math.round(summary.totalProtein) : 0}
            <span className="ml-2 text-base font-medium text-gray-500">g</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">기록</div>
          <div className="mt-1 text-3xl font-semibold text-gray-900">
            {items?.length ?? 0}
            <span className="ml-2 text-base font-medium text-gray-500">items</span>
          </div>
        </div>
      </section>

      {/* Items table */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">오늘 먹은 것</h2>
          <span className="text-sm text-gray-500">{dayjs().format("YYYY-MM-DD")}</span>
        </div>

        {items.length === 0 ? (
          <div className="px-5 pb-6 text-sm text-gray-600">
            아직 기록이 없네. 대충 “계란 2개”부터 던져봐.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-gray-100 text-xs text-gray-500">
                <tr>
                  <th className="px-5 py-3">음식</th>
                  <th className="px-5 py-3">수량</th>
                  <th className="px-5 py-3">칼로리</th>
                  <th className="px-5 py-3">단백질</th>
                  <th className="px-5 py-3">시간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{it.name}</td>
                    <td className="px-5 py-3 text-gray-700">x{it.count}</td>
                    <td className="px-5 py-3 text-gray-700">{Math.round(it.calories)}</td>
                    <td className="px-5 py-3 text-gray-700">{Math.round(it.protein)}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {it.createdAt ? dayjs(it.createdAt).format("YYYY-MM-DD HH:mm") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* needConfirm */}
        {needConfirm && (
          <div className="border-t border-amber-100 bg-amber-50 px-5 py-4">
            <div className="text-sm font-semibold text-amber-900">
              ‘{needConfirm.rawName}’는 등록된 음식이 아니야
            </div>

            <div className="mt-2 text-sm text-amber-900/80">
              {Array.isArray(needConfirm.suggestions) && needConfirm.suggestions.length > 0
                ? "혹시 이거였냐?"
                : "추천 후보가 없네."}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {Array.isArray(needConfirm.suggestions) &&
                needConfirm.suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleChooseSuggestion(s.name, needConfirm.count)}
                    className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100/50"
                  >
                    {s.name} ({Math.round(s.protein)}g)
                  </button>
                ))}

              <button
                onClick={() => openManual(needConfirm.rawName, needConfirm.count)}
                className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                그냥 추정으로 기록
              </button>
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-gray-100 px-5 py-4">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="예: 오늘 식단 시작  /  계란 2개  /  닭가슴살 1개"
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
            />
            <button
              onClick={send}
              className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800"
            >
              전송
            </button>
          </div>
        </div>
      </section>

      {/* Logs */}
      <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">대화 로그</h3>

        <div className="mt-3 space-y-3">
          {logs.map((log, idx) => {
            const isUser = log.role === "user";
            return (
              <div key={idx} className={["flex", isUser ? "justify-end" : "justify-start"].join(" ")}>
                <div
                  className={[
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    isUser ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900",
                  ].join(" ")}
                >
                  <div className="mb-1 text-xs opacity-70">{isUser ? "나" : "GPT"}</div>
                  <div className="whitespace-pre-line">{log.text}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  </div>
);

}


export default Dashboard;
