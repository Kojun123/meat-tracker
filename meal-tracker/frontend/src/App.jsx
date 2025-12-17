import { useState } from 'react'

function App() {
  const [input, setInput] = useState('')
  const [logs, setLogs] = useState([])

  const send = async () => {
      const text = input.trim()
      if(!text) return

      setLogs((prev) => [
        ...prev,
        {role: 'user', text}
      ])

      setInput('')

      const res = await fetch('/api/meal/message', {
        method: 'POST',
        headers: {'Content-Type': 'application/json' },
        body: JSON.stringify({message:text})
      })

      const data = await res.json()

      setLogs((prev) => [
        ...prev,
        {role: 'assistant', text: data.assistantText}
      ])
  }

  return (
    <div style={{ padding: 40, maxWidth: 600}}>
      <h1>Meal Tracker</h1>
      <div style={{display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ex: 오늘 식단 시작"
          style={{flex: 1, padding: 8}}
        />

        <button onClick={send}>
         전송
        </button>
      </div>

        <div style={{marginTop: 20}}>
          {logs.map((log, idx) => (
            <div key={idx} style={{marginBottom: 8}}>
              <b>
                {log.role === 'user' ? '나' : 'GPT'}:
              </b>{' '}

              {log.text}
              </div>
          ))}
        </div>
    </div>
  )
}

export default App
