import { useState, useEffect } from 'react'
import { TodoList } from './components/TodoList'
import { Timer } from './components/Timer'
import { Notepad } from './components/Notepad'
import { HelpModal } from './components/HelpModal'

function App() {
    const [completedSessions, setCompletedSessions] = useState(0)
    const [isHelpOpen, setIsHelpOpen] = useState(false)
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('dashboard-theme') || 'dark'
        }
        return 'dark'
    })

    // Theme Effect
    useEffect(() => {
        document.body.className = theme === 'light' ? 'light-mode' : ''
        localStorage.setItem('dashboard-theme', theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark')
    }

    // Load/Reset daily progress
    useEffect(() => {
        const today = new Date().toLocaleDateString()
        const lastDate = localStorage.getItem('dashboard-timer-date')
        const savedSessions = parseInt(localStorage.getItem('dashboard-sessions') || '0', 10)

        if (lastDate !== today) {
            setCompletedSessions(0)
            localStorage.setItem('dashboard-timer-date', today)
            localStorage.setItem('dashboard-sessions', '0')
        } else {
            setCompletedSessions(savedSessions)
        }
    }, [])

    // Persist sessions
    useEffect(() => {
        localStorage.setItem('dashboard-sessions', completedSessions.toString())
        localStorage.setItem('dashboard-timer-date', new Date().toLocaleDateString())
    }, [completedSessions])

    const getMotivationalMessage = () => {
        if (completedSessions === 0) return <>⏲️ <span>Ready to focus?</span></>
        if (completedSessions < 4) return <>🎢 <span>Momentum building...</span></>
        if (completedSessions < 8) return <>🔥 <span>You're on fire!</span></>
        return <>🎉 <span>You crushed it today!</span></>
    }

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="header-controls">
                    <button
                        onClick={() => setIsHelpOpen(true)}
                        className="icon-btn"
                        title="Help & Features"
                    >
                        ?
                    </button>
                    <button
                        onClick={toggleTheme}
                        className="icon-btn"
                        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                </div>
                <h1>{getMotivationalMessage()}</h1>
            </header>
            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
            <main className="app-grid">
                <div className="card">
                    <h2>Todos</h2>
                    <TodoList />
                </div>
                <div className="card">
                    <h2>Timer</h2>
                    <Timer
                        completedSessions={completedSessions}
                        setCompletedSessions={setCompletedSessions}
                    />
                </div>
                <div className="card notes-card">
                    <h2>Notes</h2>
                    <Notepad />
                </div>
            </main>
        </div>
    )
}

export default App
