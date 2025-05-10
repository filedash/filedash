# FileDash

A modern, minimal, high-performance file browser.

## Tech Stack

- **Backend**: Rust with Axum (Actix optional)
- **Frontend**: React + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Database**: SQLite (for config/auth/multi-user)
- **Containerization**: Docker

## Features

- 📂 File Explorer (with metadata: name, size, date, permissions)
- 🔄 File operations: upload, download (resumable), rename, delete, move
- 🔍 Fuzzy search
- 🔐 Auth (JWT/session)
- 🌓 Dark mode, responsive UI
- 🖼️ File previews (images, PDFs, text)
- 🛡️ Security: sandboxed access, path validation, DOS protection

## Project Goals

- Full backend in Rust (Axum preferred)
- REST API for file operations + search
- Frontend served statically by the backend
- Dockerfile for unified deployment

## Project Structure

