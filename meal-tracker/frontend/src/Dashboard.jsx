import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs"; //날짜 포맷
import EditItemModal from "./components/EditItemModal";
import GoalSettingModal from "./components/GoalSettingModal";
import DashboardHeader from "./components/DashboardHeader";
import StatsCards from "./components/StatsCards";
import Composer from "./components/Composer";
import Swal from "sweetalert2";
import DatePopover from "./components/DatePopover";


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
const [loading, setLoading] = useState(false);

//editModal
const [editOpen, setEditOpen] = useState(false);
const [editItem, setEditItem] = useState(null);

const [goalOpen, setGoalOpen] = useState(false);
const [targetCalories, setTargetCalories] = useState(2000);
const [targetProtein, setTargetProtein] = useState(150);

//toast알림
const [toast, setToast] = useState(null);

//datepicker
const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));
const [dateOpen, setDateOpen] = useState(false);



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
  console.log("selectedDate changed", selectedDate);
  loadDashBoard(selectedDate);
}, [selectedDate]);

useEffect(() => {
  const handler = (e) => {
    if(!e.target.closest?.("[data-date-popover]")) {
      setDateOpen(false);
    }
  };
  if(dateOpen) document.addEventListener("mousedown", handler);
  return () => document.removeEventListener("mousedown", handler);
}, [dateOpen])
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
    if (!trimmed || loading) return;

    setLoading(true);  
    setInput("");

    const userMsgId = crypto.randomUUID();
    const gptMsgId = crypto.randomUUID();
    const now = new Date().toISOString();

    setLogs(prev => [      
      { id: userMsgId, role: "USER", log: trimmed, createdAt: now, pending: false},
      ...prev
    ]);

    setLogs(prev => [
      {id: gptMsgId, role: "GPT", log: "", createdAt: now, pending: true},
      ...prev
    ])

    try {
    const res = await fetch("/api/meal/item", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: trimmed }),
    });

    if (!res.ok) throw new Error("서버 응답 오류");   

    const data = await res.json();

    handleServerResponse(data);

    const gptText = data.assistantText ?? "기록 완료";
    const gptAt = data.createdAt ?? new Date().toISOString();

    setLogs((prev) =>
      prev.map((log) =>
        log.id === gptMsgId
          ? { ...log, log: gptText, createdAt: gptAt, pending: false }
          : log
      )
    );
    } catch (e) {
      console.error(e);
      setLogs((prev) =>
      prev.map((log) =>
        log.id === gptMsgId
          ? { ...log, log: "오류가 발생했어요. 다시 시도해주세요.", pending: false }
          : log
      )
    );
      showToast("error", "메시지 전송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  

  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setLoading(true);
    try {
      await sendText(text);
    } finally {
      setLoading(false);
    }    
  };

  //아이템 삭제
  const onDelete = async (item) => {

    const result = await Swal.fire({
      title: '정말로 삭제하시겠어요?',
      text: "이 작업은 되돌릴 수 없어요.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'rgb(250, 102, 102)',
      cancelButtonColor: '#3085d6',
      confirmButtonText: '삭제',
      cancelButtonText: '취소'
    })
  

    if(!result.isConfirmed) return;
    
    const res = await fetch(`/api/meal/item/${item.id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) return;

    const data = await res.json().catch(() => null);
    if (data) handleServerResponse(data);
    else loadDashBoard(selectedDate); 
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

  const submitEdit = async() => {
    if (!editItem) return;

    const id = editItem.id;
    const name = (editItem.name ?? "").trim();
    const count = Number(editItem.count);
    const calories = Number(editItem.calories);
    const protein = Number(editItem.protein);

    if (!name) {
      showToast("error", "음식명을 입력해주세요.");
      return;
    }
    if (!Number.isFinite(count) || count <= 0) {
      showToast("error", "수량을 올바르게 입력해주세요.");
      return;
    }
    if (!Number.isFinite(calories) || calories < 0) {
      showToast("error", "칼로리를 올바르게 입력해주세요.");
      return;
    }
    if (!Number.isFinite(protein) || protein < 0) {
      showToast("error", "단백질을 올바르게 입력해주세요.");
      return;
    }

    const res = await fetch(`/api/meal/item/${editItem.id}`, {
      method: "PUT",
      credentials: "include",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({id, name, count, calories, protein}),
    });

    if (!res.ok) {
      showToast("error", "기록 수정에 실패했습니다.");
      return;
    }

    const data = await res.json().catch(() => null);

    if(data) handleServerResponse(data);
    else loadDashBoard(selectedDate);

    showToast("success", "기록이 수정되었어요.");
    setEditOpen(false);
    setEditItem(null);
  }

  return (
     <>

  <div className="min-h-screen bg-gray-50">
    <EditItemModal
      open={editOpen}
      item={editItem}
      setItem={setEditItem}
      onClose={() => {
        setEditOpen(false);
        setEditItem(null);
       }}
      onSubmit={submitEdit} 
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
      <section className="mt-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">오늘 먹은 것</h2>

           <DatePopover
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
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
                  <th className="px-5 py-3 text-right"> </th>
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

                    <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditItem({
                                id: it.id,
                                name: it.name,
                                count: it.count,
                                calories: it.calories,
                                protein: it.protein                                
                              });
                              setEditOpen(true);                                
                            }}
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            title="수정"
                          >
                             ✏️
                          </button>

                          <button
                            onClick={() => onDelete(it)}
                            className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                            title="삭제"
                          >
                              🗑️
                          </button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Composer
          input={input}
          setInput={setInput}
          onSend={send}
          loading={loading}
        />
      </section>

     <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
    <h3 className="text-base font-semibold text-gray-900">대화 로그</h3>

    <div className="mt-3 space-y-3">

    {loading && (
      <div className="flex justify-start">
        <div className="max-w-[60%] rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-700">
          <div className="mb-1 text-xs opacity-70">GPT</div>
          <div className="animate-pulse">입력 중...</div>
        </div>
      </div>
    )}
 

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

              <div className="whitespace-pre-line">
                {log.pending ? <span className="animate-pulse">{log.log}</span> : log.log}
              </div>

              
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
