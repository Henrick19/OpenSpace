import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ACTIVE_UPLOAD_STATUSES, DEFAULT_PAGE_SIZE, STATUS_LABELS } from "@openspace/shared";

import { useApi } from "../hooks/useApi.js";
import { projectApi } from "../services/projectApi.js";
import { uploadApi } from "../services/uploadApi.js";
import { formatBytes } from "../utils/format.js";
import "../styles/history.css";

// Tabs cover the states people actually look for. Preparing and Submitted
// last a few seconds each, so they appear under "All" instead.
const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "uploading", label: "Uploading" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const EMPTY_FILTERS = { search: "", status: "", siteId: "", from: "", to: "" };
const REFRESH_INTERVAL_MS = 5000;

// The date inputs give "YYYY-MM-DD". The API compares full ISO timestamps.
const startOfDay = (date) => (date ? new Date(`${date}T00:00:00`).toISOString() : "");
const endOfDay = (date) => (date ? new Date(`${date}T23:59:59.999`).toISOString() : "");

const timeFormat = new Intl.DateTimeFormat("en-SG", { hour: "2-digit", minute: "2-digit", hour12: false });
const fullFormat = new Intl.DateTimeFormat("en-SG", { dateStyle: "full", timeStyle: "short" });
const dayFormat = new Intl.DateTimeFormat("en-SG", { weekday: "short", day: "numeric", month: "short" });

/** "Today", "Yesterday" or a short date such as "Thu, 18 Sept". */
function dayLabel(iso) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return dayFormat.format(date);
}

/**
 * Splits rows into days, newest first, so each day gets one heading.
 * The API orders by upload time, so the page is sorted by capture time first.
 */
function groupByDay(uploads) {
  const groups = [];
  const byCaptureTime = [...uploads].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  for (const upload of byCaptureTime) {
    const label = dayLabel(upload.capturedAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(upload);
    else groups.push({ label, items: [upload] });
  }
  return groups;
}

/** Upload History screen: search, filter and page through local upload records. */
export function CaptureHistoryPage() {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [projects, setProjects] = useState([]);
  const [retryingId, setRetryingId] = useState(null);
  const [retryError, setRetryError] = useState("");

  useEffect(() => {
    projectApi.list().then(setProjects).catch(() => setProjects([]));
  }, []);

  // Wait until typing pauses before sending the search to the backend.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => (current.search === searchText.trim() ? current : { ...current, search: searchText.trim() }));
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // "/" jumps to search from anywhere on the page, Escape clears it.
  useEffect(() => {
    function handleKey(event) {
      const typing = ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // useApi runs again whenever this function changes: filters, page or reloadKey.
  const loadHistory = useCallback(
    () => uploadApi.list({
      search: filters.search,
      status: filters.status,
      siteId: filters.siteId,
      from: startOfDay(filters.from),
      to: endOfDay(filters.to),
      page,
      pageSize: DEFAULT_PAGE_SIZE,
    }),
    [filters, page, reloadKey], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const { data, loading, error } = useApi(loadHistory, null);

  const items = data?.items ?? [];
  const hasActiveUpload = items.some((upload) => ACTIVE_UPLOAD_STATUSES.includes(upload.status));

  // Keep running uploads live without the user reloading.
  useEffect(() => {
    if (!hasActiveUpload) return undefined;
    const timer = setInterval(() => setReloadKey((key) => key + 1), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasActiveUpload]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  }

  function clearFilters() {
    setSearchText("");
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  async function handleRetry(uploadId) {
    setRetryingId(uploadId);
    setRetryError("");
    try {
      await uploadApi.retry(uploadId);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setRetryError(requestError.message);
    } finally {
      setRetryingId(null);
    }
  }

  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? DEFAULT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);
  const isFiltered = searchText !== "" || Object.values(filters).some((value) => value !== "");
  const problem = retryError || (error && `Could not load uploads. ${error}`);

  return (
    <div className="history content-width">
      <header className="history-head">
        <h1>Upload history</h1>
        <Link className="history-btn is-primary" to="/captures/new">New upload</Link>
      </header>

      <div className="history-bar">
        <nav className="history-tabs" aria-label="Filter by status">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value || "all"}
              type="button"
              className={filters.status === tab.value ? "is-active" : ""}
              aria-pressed={filters.status === tab.value}
              onClick={() => updateFilter("status", tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="history-tools">
          <label className="history-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input
              ref={searchRef}
              type="search"
              placeholder="Search"
              aria-label="Search uploads"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Escape") setSearchText(""); }}
            />
            {!searchText && <kbd aria-hidden="true">/</kbd>}
          </label>

          <select className="history-field" aria-label="Project" value={filters.siteId} onChange={(event) => updateFilter("siteId", event.target.value)}>
            <option value="">All projects</option>
            {projects.map((project) => <option key={project.siteId} value={project.siteId}>{project.name}</option>)}
          </select>

          <div className="history-dates">
            <input type="date" aria-label="Captured from" value={filters.from} max={filters.to || undefined} onChange={(event) => updateFilter("from", event.target.value)} />
            <span aria-hidden="true">–</span>
            <input type="date" aria-label="Captured to" value={filters.to} min={filters.from || undefined} onChange={(event) => updateFilter("to", event.target.value)} />
          </div>

          {isFiltered && <button type="button" className="history-clear" onClick={clearFilters}>Clear</button>}
        </div>
      </div>

      {problem && (
        <div className="history-alert" role="alert">
          <span>{problem}</span>
          <button type="button" onClick={() => { setRetryError(""); setReloadKey((key) => key + 1); }}>Try again</button>
        </div>
      )}

      <section className="history-list" aria-busy={loading}>
        {loading && !data && [0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="history-row is-skeleton" aria-hidden="true">
            <i /><i /><i /><i /><i />
          </div>
        ))}

        {data && items.length === 0 && (
          <div className="history-empty">
            <p>{isFiltered ? "Nothing matches these filters." : "No uploads yet."}</p>
            {isFiltered
              ? <button type="button" className="history-btn" onClick={clearFilters}>Clear filters</button>
              : <Link className="history-btn is-primary" to="/captures/new">New upload</Link>}
          </div>
        )}

        {groupByDay(items).map((group) => (
          <div key={`${group.label}-${group.items[0].id}`} className="history-group">
            <h2 className="history-day">
              {group.label}
              <span>{group.items.length}</span>
            </h2>

            {group.items.map((upload) => {
              const open = () => navigate(`/captures/${upload.id}/progress`);
              const moving = ACTIVE_UPLOAD_STATUSES.includes(upload.status);
              return (
                <div
                  key={upload.id}
                  className={`history-row is-${upload.status}`}
                  role="link"
                  tabIndex={0}
                  onClick={open}
                  onKeyDown={(event) => { if (event.key === "Enter" && event.target === event.currentTarget) open(); }}
                >
                  <span className="history-name" title={upload.captureName}>{upload.captureName}</span>

                  <span className="history-status" title={upload.errorMessage ?? undefined}>
                    <i className="history-dot" aria-hidden="true" />
                    {STATUS_LABELS[upload.status]}
                    {upload.status === "uploading" && <em>{upload.uploadProgress}%</em>}
                  </span>

                  <span className="history-floor" title={upload.projectName}>{upload.floorName}</span>
                  <span className="history-file" title={upload.fileName}>{upload.fileName}</span>
                  <span className="history-size">{formatBytes(upload.fileSize)}</span>
                  <time className="history-time" dateTime={upload.capturedAt} title={fullFormat.format(new Date(upload.capturedAt))}>
                    {timeFormat.format(new Date(upload.capturedAt))}
                  </time>

                  <span className="history-action" onClick={(event) => event.stopPropagation()}>
                    {upload.status === "failed" && (
                      <button type="button" disabled={retryingId === upload.id} onClick={() => handleRetry(upload.id)}>
                        {retryingId === upload.id ? "Retrying" : "Retry"}
                      </button>
                    )}
                    {upload.status === "completed" && upload.viewerUrl && (
                      <a href={upload.viewerUrl} target="_blank" rel="noreferrer">
                        Open
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M7 17 17 7" /><path d="M8 7h9v9" /></svg>
                      </a>
                    )}
                  </span>

                  {moving && (
                    <span
                      className={`history-progress${upload.status === "uploading" ? "" : " is-waiting"}`}
                      style={upload.status === "uploading" ? { "--progress": `${upload.uploadProgress}%` } : undefined}
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </section>

      {data && total > 0 && (
        <footer className="history-foot">
          <span>{firstRow}–{lastRow} of {total}</span>
          <div>
            <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
            <span>{page} / {totalPages}</span>
            <button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>›</button>
          </div>
        </footer>
      )}
    </div>
  );
}
