import { useState, useEffect, useRef } from 'react'

interface TimerProps {
    completedSessions: number
    setCompletedSessions: (n: number | ((n: number) => number)) => void
}

export function Timer({ completedSessions, setCompletedSessions }: TimerProps) {
    const FOCUS_TIME = 25 * 60
    const BREAK_TIME = 5 * 60

    const [timeLeft, setTimeLeft] = useState(FOCUS_TIME)
    const [isActive, setIsActive] = useState(false)
    const [mode, setMode] = useState<'focus' | 'break'>('focus')
    const intervalRef = useRef<number | null>(null)
    const hasCompletedRef = useRef(false)

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            hasCompletedRef.current = false
            intervalRef.current = window.setInterval(() => {
                setTimeLeft((t) => t - 1)
            }, 1000)
        } else if (timeLeft === 0 && isActive) {
            setIsActive(false)
            new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(() => { })
            if (intervalRef.current) clearInterval(intervalRef.current)

            if (!hasCompletedRef.current && mode === 'focus') {
                hasCompletedRef.current = true
                setCompletedSessions(c => c + 1)
            }
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [isActive, timeLeft, mode, setCompletedSessions])

    const toggleTimer = () => setIsActive(!isActive)

    const resetTimer = () => {
        setIsActive(false)
        setTimeLeft(mode === 'focus' ? FOCUS_TIME : BREAK_TIME)
    }

    const clearProgress = () => {
        setCompletedSessions(0)
    }

    const switchMode = (newMode: 'focus' | 'break') => {
        setMode(newMode)
        setIsActive(false)
        setTimeLeft(newMode === 'focus' ? FOCUS_TIME : BREAK_TIME)
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="timer-container">
            <div className="timer-display">{formatTime(timeLeft)}</div>

            <div className="timer-controls">
                <button
                    onClick={toggleTimer}
                    className={`timer-btn ${isActive ? 'active' : ''}`}
                >
                    {isActive ? 'Pause' : 'Start'}
                </button>
                <button onClick={resetTimer} className="timer-btn secondary">
                    Reset
                </button>
            </div>

            <div className="mode-switch">
                <button
                    className={`mode-btn ${mode === 'focus' ? 'active' : ''}`}
                    onClick={() => switchMode('focus')}
                >
                    Focus
                </button>
                <button
                    className={`mode-btn ${mode === 'break' ? 'active' : ''}`}
                    onClick={() => switchMode('break')}
                >
                    Break
                </button>
            </div>

            <div className="daily-progress">
                <div className="progress-label">Daily Progress</div>
                <div className="progress-dots">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div
                            key={i}
                            className={`progress-dot ${i < completedSessions ? 'filled' : ''}`}
                            title={i < completedSessions ? 'Completed' : 'Upcoming'}
                        />
                    ))}
                    <button onClick={clearProgress} className="clear-btn" title="Clear daily progress">×</button>
                </div>
            </div>
        </div>
    )
}
