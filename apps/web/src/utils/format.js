export function formatBytes(bytes = 0){
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}                         

export function formatDateTime(value) {
    if (!value) return "_";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "_";
    return new Intl.DateTimeFormat("en-SG", {
        dataStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

export function toLocalDateTimeInput(date = new Date()) {
    const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return adjusted.toISOString().slice(0,16);
}