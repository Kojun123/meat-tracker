export default function DashboardHeader({ user, onOpenGoal, onLogout }) {
  const name = user?.email ? user.email.split("@")[0] : null;

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
          Meal Tracker
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          먹은 거 대충 던지면 기록해주는 앱
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {name && (
          <span className="text-sm font-medium text-gray-700">{name} 님</span>
        )}

        <button
          className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          onClick={onOpenGoal}
          type="button"
        >
          <span aria-hidden>⚙</span>
          <span>목표 설정</span>
        </button>

        <button
          onClick={onLogout}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          type="button"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
