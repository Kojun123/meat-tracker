import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs"; //날짜 포맷
import ManualModal from "./components/ManualModal";
import GoalSettingModal from "./components/GoalSettingModal";
import DashboardHeader from "./components/DashboardHeader";
import StatsCards from "./components/StatsCards";
import Composer from "./components/Composer";
import DatePickerChip from "./components/DatePickerChip";


function Dashboard() {

const navigate = useNavigate();

// data
const [user, setUser] = useState(null);
const [summary, setSummary] = useState(null);
const [items, setItems] = useState([]);
const [session, setSession] = useState(null);

// chat/ui
const [input, setInput] = useState("");
const [logs, setLogs] = useState([]);
const [needConfirm, setNeedConfirm] = useState(null);

// modals
const [manualOpen, setManualOpen] = useState(false);
const [manual, setManual] = useState({ rawName:"", count:1, protein:"", kcal:"" });

const [goalOpen, setGoalOpen] = useState(false);
const [targetCalories, setTargetCalories] = useState(2000);
const [targetProtein, setTargetProtein] = useState(150);

//toast알림
const [toast, setToast] = useState(null);

//datepicker
const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));



//=======================useEffect=======================
useEffect(() => {
  (async () => {
    const user = await fetch("/auth/me", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type" : "application/json" }
    });

    if (user.status === 401) {
      navigate("/login");
      return;
    }
    
    const data = await user.json();
    setUser(data);
    console.log("user", data);
    
    loadDashBoard();
  })();
}, []);

useEffect(() => {
  if (!user) return;
  setTargetCalories(user.targetCalories ?? 2000);
  setTargetProtein(user.targetProtein ?? 150);
}, [user]);

useEffect(() => {
  loadDashBoard(selectedDate);
}, [selectedDate]);
//=======================useEffect=======================

const showToast = (type, message) => {
    setToast({type, message});
    setTimeout(() => setToast(null), 2500)
}

const loadDashBoard = async (date) => {
  if (!date) date = dayjs().format("YYYY-MM-DD");
    const res = await fetch(`/api/meal/today?date=${date}`, {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    if(res.status === 401) {
      navigate("/login");
      return;
    }

    const data = await res.json();
    console.log("dashboard data", data);
    setSummary(data.todaySummary);
    setItems(data.items ?? []);
    setLogs(data.chatLog ?? []);
    setSession(data.session);
};

  const sendText = async (text) => {
    const trimmed = (text ?? "").trim();
    if (!trimmed) return;

    // 새 메시지 보내면 기존 needConfirm은 닫음
    setNeedConfirm(null);
    
    setInput("");

    const res = await fetch("/api/meal/message", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: trimmed }),
    });

    if (!res.ok) {
      return;
    }

    const data = await res.json();
    handleServerResponse(data);

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


  // needConfirm 버튼 핸들러
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

  const saveGoal = async() => {
    const cal = Number(targetCalories);
    const protein = Number(targetProtein);

    if(!Number.isFinite(cal) || cal <= 0) {
      showToast("error", "칼로리를 입력해주세요.");
      return;
    }
    if(!Number.isFinite(protein) || protein <= 0) {
      showToast("error", "단백질을 입력해주세요.");
      return;
    }

      const res = await fetch("/auth/target", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetCalories: cal, targetProtein: protein }),
  });

  if (!res.ok) {
    showToast("error", "저장에 실패했습니다.");
    return;
  }

    const updated = await res.json().catch(() => null);

  if(updated) {
     setUser(updated);     
  }
  else {
    setUser((prev) => (prev ? { ...prev, targetCalories: cal, targetProtein: protein } : prev));
  }

  showToast("success", "목표가 설정되었어요");
  setGoalOpen(false);
  }


  function handleServerResponse(res) {    
    setSummary(res.todaySummary);
    setItems(res.items ?? []);
    setLogs(res.chatLog ?? []);
  }

  

  return (
     <>

  <div className="min-h-screen bg-gray-50">
    <ManualModal
      open={manualOpen}
      manual={manual}
      setManual={setManual}
      onClose={() => setManualOpen(false)}
      onSubmit={submitManual}
    />

    <GoalSettingModal
      open={goalOpen}
      targetCalories={targetCalories}
      setTargetCalories={setTargetCalories}
      targetProtein={targetProtein}
      setTargetProtein={setTargetProtein}
      onClose={() => setGoalOpen(false)}
      onSave={saveGoal}
    />

 <div className="mx-auto max-w-5xl px-6 py-8">
  {toast && (
    <div className="mb-4 flex justify-end">
      <div
        className={[
          "rounded-xl px-4 py-3 text-sm font-medium shadow-sm border",
          toast.type === "success"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-red-50 text-red-800 border-red-200",
        ].join(" ")}
      >
        {toast.message}
      </div>
    </div>
  )}

      <DashboardHeader
        user={user}
        onOpenGoal={() => setGoalOpen(true)}
        onLogout={async () => {
          await fetch("/auth/logout", {method: "POST", credentials: "include"}).catch(() => {});
          navigate("/login");
        }}
      />

      <StatsCards
        summary={summary}
        user={user}
        itemsCount={items?.length ?? 0}
      />

      {/* Items table */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">오늘 먹은 것</h2>
          
          <DatePickerChip
              value={selectedDate}
              onChange={setSelectedDate}
            />

        </div>

        {items.length === 0 ? (
          <div className="px-5 pb-6 text-sm text-gray-600">
            아직 기록이 없어요
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
              ‘{needConfirm.rawName}’를 
            </div>

            <div className="mt-2 text-sm text-amber-900/80">
              {Array.isArray(needConfirm.suggestions) && needConfirm.suggestions.length > 0
                ? "혹시 이거였나요?"
                : "추천 후보가 없어요."}
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
                그냥 추정으로 기록하기
              </button>
            </div>
          </div>
        )}

        <Composer
          input={input}
          setInput={setInput}
          onSend={send}
        />
      </section>

     <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
    <h3 className="text-base font-semibold text-gray-900">대화 로그</h3>

    <div className="mt-3 space-y-3">
      {logs.map((log, idx) => {
        const isUser = log.role === "USER";
        const time = log.createdAt
          ? dayjs(log.createdAt).format("HH:mm:ss")
          : null;

        return (
          <div
            key={idx}
            className={["flex", isUser ? "justify-end" : "justify-start"].join(" ")}
          >
            <div
              className={[
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                isUser ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900",
              ].join(" ")}
            >
              <div className="mb-1 text-xs opacity-70">
                {isUser ? "나" : "GPT"}
              </div>

              <div className="whitespace-pre-line">{log.log}</div>

              {/* 🔽 여기: 채팅 시간 */}
              {time && (
                <div
                  className={[
                    "mt-1 text-[11px] opacity-60",
                    isUser ? "text-right" : "text-left",
                  ].join(" ")}
                >
                  {time}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </section>

      
    </div>
  </div>
  </>
);

}


export default Dashboard;
