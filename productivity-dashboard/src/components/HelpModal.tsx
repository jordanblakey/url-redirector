interface HelpModalProps {
    isOpen: boolean
    onClose: () => void
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
    if (!isOpen) return null

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Pomodoro Features</h2>
                    <button onClick={onClose} className="close-modal-btn">×</button>
                </div>

                <div className="modal-body">
                    <section>
                        <h3>📝 Task Manager</h3>
                        <p>Add tasks, toggle completion, and delete items. Everything is saved automatically.</p>
                    </section>

                    <section>
                        <h3>⏱️ Enhanced Pomodoro</h3>
                        <p>Track your daily focus sessions. Complete 25-minute intervals to fill the progress dots. The count resets every day at midnight.</p>
                    </section>

                    <section>
                        <h3>🗒️ Quick Notes</h3>
                        <p>A simple scratchpad for your thoughts. Auto-saves as you type.</p>
                    </section>

                    <section>
                        <h3>🌓 Theme</h3>
                        <p>Toggle between Dark and Light mode using the icon in the top right.</p>
                    </section>
                </div>
            </div>
        </div>
    )
}
