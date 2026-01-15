export default function Compose({input, setInput, onSend, loading}) {
    return (
        <div className="border-t border-gray-100 px-5 py-4">
            <div className="flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") onSend();
                    }}
                    placeholder="ex) 계란 2개, 닭가슴살 1개"
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                />                
                <button
                    onClick={onSend}
                    disabled={loading}
                    className={[
                         "rounded-xl px-4 py-2 font-semibold",
                            loading
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-gray-900 text-white hover:bg-gray-800",
                        ].join(" ")}                    
                >
                    {loading ? "전송 중..." : "전송"}
                </button>
            </div>
        </div>
    )
}