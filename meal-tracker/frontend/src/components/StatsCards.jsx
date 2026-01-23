export default function StatsCards({ summary, user, itemsCount }) {
  const totalCalories = summary ? Math.round(summary.totalCalories) : 0;
  const totalProtein = summary ? Math.round(summary.totalProtein) : 0;

  const targetCalories = user ? Math.round(user.targetCalories ?? 0) : 0;
  const targetProtein = user ? Math.round(user.targetProtein ?? 0) : 0;

  return (
    <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-500">칼로리</div>
        <div className="mt-1 text-2xl font-semibold text-gray-900 sm:text-3xl">
          {totalCalories} / {targetCalories}
          <span className="ml-2 text-sm font-medium text-gray-500 sm:text-base">
            kcal
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-500">단백질</div>
        <div className="mt-1 text-2xl font-semibold text-gray-900 sm:text-3xl">
          {totalProtein} / {targetProtein}
          <span className="ml-2 text-sm font-medium text-gray-500 sm:text-base">
            g
          </span>
        </div>
      </div>

      <div className="col-span-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:col-span-1">
        <div className="text-sm text-gray-500">기록</div>
        <div className="mt-1 text-2xl font-semibold text-gray-900 sm:text-3xl">
          {itemsCount}
          <span className="ml-2 text-sm font-medium text-gray-500 sm:text-base">
            items
          </span>
        </div>
      </div>
    </section>
  );
}
