import { useState, useEffect } from 'react'

export function Notepad() {
    const [note, setNote] = useState(() => {
        return localStorage.getItem('dashboard-note') || ''
    })

    useEffect(() => {
        localStorage.setItem('dashboard-note', note)
    }, [note])

    return (
        <div className="notepad-container">
            <textarea
                className="notepad-area"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Jot down your thoughts..."
            />
            <div className="notepad-status">
                {note ? 'Saved' : 'Empty'}
            </div>
        </div>
    )
}
