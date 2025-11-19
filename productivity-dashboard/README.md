# Personal Productivity Dashboard

A "useful immediately" Personal Productivity Dashboard built with React, TypeScript, and Vanilla CSS. It combines a Task Manager, Focus Timer, and Quick Notes into a single, aesthetically pleasing interface.

## Features

### 1. Task Manager (Todo List)
- **Add Tasks**: Quickly add new tasks to your list.
- **Toggle Completion**: Mark tasks as done with a satisfying strikethrough.
- **Delete**: Remove tasks you no longer need.
- **Persistence**: Your tasks are saved automatically to `localStorage`.

### 2. Enhanced Pomodoro Timer
- **Focus/Break Modes**: Standard 25-minute focus and 5-minute break intervals.
- **Daily Tracking**: Tracks how many "Focus" sessions you complete each day.
- **Visual Progress**: A row of 8 dots fills up as you complete sessions.
- **Daily Reset**: Automatically resets your count at the start of a new day.
- **Dynamic Header**: The main app header changes based on your progress.

### 3. Quick Notes (Notepad)
- **Auto-Save**: Type anything, and it saves instantly to `localStorage`.
- **Full Width**: Spans the bottom of the dashboard for easy access.

### 4. Dark / Light Mode
- **Toggle**: Switch between a deep, focus-friendly Dark Mode and a crisp, bright Light Mode.
- **Smart Styling**: All colors adapt automatically.

## Tech Stack
- **Framework**: React + TypeScript + Vite
- **Styling**: Vanilla CSS (Glassmorphism)
- **State**: LocalStorage + React Hooks

## Getting Started

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Run the dev server:
    ```bash
    npm run dev
    ```
