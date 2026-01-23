import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email, password }),
        credentials: "include",
      });

      if (res.status === 200) {
        navigate("/");
        return;
      }

      setErr("이메일 또는 비밀번호가 틀림");
    } catch {
      setErr("네트워크 오류");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto flex min-h-dvh max-w-5xl items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-8">
            <header className="space-y-1">
              <div className="text-xl font-semibold text-gray-900 sm:text-2xl">
                Meal Tracker
              </div>
              <div className="text-xs text-gray-500 sm:text-sm">
                대충 기록하는 식단
              </div>
            </header>

            <form className="mt-6 space-y-4 sm:mt-8 sm:space-y-5" onSubmit={submit}>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  이메일
                </label>
                <input
                  className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  비밀번호
                </label>
                <input
                  className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              {err && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {err}
                </div>
              )}

              <button
                className={[
                  "h-11 w-full rounded-xl text-sm font-semibold transition",
                  loading
                    ? "cursor-not-allowed bg-gray-200 text-gray-500"
                    : "bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-900",
                ].join(" ")}
                type="submit"
                disabled={loading}
              >
                {loading ? "로그인 중..." : "로그인"}
              </button>

              <div className="pt-1 text-center text-sm text-gray-600">
                <button
                  type="button"
                  className="font-semibold text-gray-900 hover:underline"
                  onClick={() => navigate("/signup")}
                >
                  회원가입
                </button>
              </div>
            </form>
          </div>

          <div className="mt-5 text-center text-[11px] text-gray-400 sm:mt-6 sm:text-xs">
            ---
          </div>
        </div>
      </div>
    </div>
  );
}
