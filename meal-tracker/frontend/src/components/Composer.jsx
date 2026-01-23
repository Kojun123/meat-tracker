export default function Compose({ input, setInput, onSend, loading }) {
  return (
    <div className="border-t border-gray-100 px-4 py-4 sm:px-5">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.isComposing) return;
            if (e.key === "Enter") {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="ex) 계란 2개, 닭가슴살 1개"
          className="h-11 flex-1 rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
        />

        <button
          onClick={onSend}
          disabled={loading}
          type="button"
          className={[
            "h-11 shrink-0 rounded-xl px-4 text-sm font-semibold transition",
            loading
              ? "cursor-not-allowed bg-gray-300 text-gray-700"
              : "bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-900",
          ].join(" ")}
        >
          {loading ? "전송 중..." : "전송"}
        </button>
      </div>
    </div>
  );
}
