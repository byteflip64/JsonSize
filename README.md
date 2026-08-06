# 🔍 GitHub & JSON Inspector + Editor

A lightweight, zero-dependency, client-side web utility designed to inspect JSON structures, evaluate raw vs. compressed file sizes, manage batch course data directly from GitHub repositories, and interactively edit or append new content.

---

## ✨ Features

### 🌐 1. Any URL JSON Inspector
* **Fetch & Analyze:** Load JSON from any public URL (GitHub blobs, APIs, CDNs).
* **Compression Metrics:** Displays original raw size, minified size, and percentage saved.
* **Auto-Disable Compressed Action:** Automatically detects if a JSON payload is already minified and disables the compress action to prevent duplicate operations.
* **One-Click Compression & Copy:** Minifies JSON data and copies it directly to your clipboard with animated feedback (`✓ Compressed & Copied!`).

### 📦 2. Batch Course Fetcher & Evaluator
* **GitHub Repository Integration:** Fetches manifest files directly from your GitHub profile/repos.
* **Total Size Calculation:** Automatically calculates the combined raw file size across all fetched course files.
* **Search & Sort:** Filter files by name, or sort by size (High/Low) and structure count.
* **Quick Actions:** Instant view of individual course parts, direct copy options, or one-click transfer into the built-in editor.

### ✏️ 3. Interactive JSON Editor & Append Tool
* **Live Editor with Line Numbers:** In-browser JSON editor with synced line numbers and smooth scrolling.
* **JSON Prettifier & Validator:** Format unorganized JSON into readable syntax with standard 2-space indentation.
* **Append Parts Modal:** Append single or multiple lesson/part objects directly into an existing `parts` array without manual syntax editing.

---

## 📁 Project Structure

```text
.
├── index.html   # Markup structure, tab navigation, and modal overlays
├── style.css    # Clean GitHub-inspired UI, responsive layout, and dark themes
└── script.js    # Core app logic, JSON parser, size calculations, & state management
