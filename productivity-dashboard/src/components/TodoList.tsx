import { useState, useEffect } from 'react'

interface Todo {
    id: string
    text: string
    completed: boolean
}

export function TodoList() {
    const [todos, setTodos] = useState<Todo[]>(() => {
        const saved = localStorage.getItem('dashboard-todos')
        return saved ? JSON.parse(saved) : []
    })
    const [input, setInput] = useState('')

    useEffect(() => {
        localStorage.setItem('dashboard-todos', JSON.stringify(todos))
    }, [todos])

    const addTodo = (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim()) return

        setTodos([
            ...todos,
            { id: crypto.randomUUID(), text: input.trim(), completed: false }
        ])
        setInput('')
    }

    const toggleTodo = (id: string) => {
        setTodos(todos.map(t =>
            t.id === id ? { ...t, completed: !t.completed } : t
        ))
    }

    const deleteTodo = (id: string) => {
        setTodos(todos.filter(t => t.id !== id))
    }

    return (
        <div className="todo-container">
            <form onSubmit={addTodo} className="todo-form">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Add a new task..."
                    className="todo-input"
                />
                <button type="submit" className="todo-btn">Add</button>
            </form>

            <ul className="todo-list">
                {todos.map(todo => (
                    <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                        <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => toggleTodo(todo.id)}
                            className="todo-checkbox"
                        />
                        <span className="todo-text">{todo.text}</span>
                        <button
                            onClick={() => deleteTodo(todo.id)}
                            className="delete-btn"
                            aria-label="Delete task"
                        >
                            ×
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}
