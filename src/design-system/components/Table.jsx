import { useLayoutEffect, useRef } from "react";

const MONEY_KEY =
  /price|fee|amount|cash|remitt|paidout|payout|released|collected|payable|revenue|earning|spent|money|cost|owe|due(?!date)|balance|commission|orders|items|reviews|qty|used|count|minimum|avg|share|shops|rating/i;
const MONEY_HEADER =
  /^(price|fee|cash due|payable|amount|revenue|spent|total|orders|items|reviews|used|avg|share|shops|rating|pickup|delivery|minimum)$/i;
const DATE_KEY = /^(updatedat|updated|createdat|created)$/i;
const DATE_HEADER = /^(updated|created)$/i;

function stickyCount(stickyLeft) {
  const n = Number(stickyLeft);
  if (n === 2) return 2;
  if (n === 1) return 1;
  return 0;
}

function columnAlign(value) {
  if (value === "left" || value === "center" || value === "right") return value;
  return null;
}

function columnWidth(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return `${value}px`;
  return String(value);
}

function inferRole(col) {
  const key = String(col.key || "").toLowerCase();
  const header =
    typeof col.header === "string" ? col.header.trim().toLowerCase() : "";
  if (key === "actions" || header === "actions") return "actions";
  if (MONEY_KEY.test(key) || MONEY_HEADER.test(header)) return "money";
  if (key === "status" || header === "status") return "status";
  if (DATE_KEY.test(key) || DATE_HEADER.test(header)) return "date";
  return "text";
}

function resolveColumn(col) {
  const role = inferRole(col);
  const align =
    columnAlign(col.align) ||
    (role === "money" ? "right" : "left");
  return { role, align, width: columnWidth(col.width) };
}

function cellClass(layout) {
  return `jd-tbl--${layout.align} jd-tbl--${layout.role}`;
}

function sortIndicator(active, sortDir) {
  if (!active) return "↕";
  return sortDir === "asc" ? "↑" : "↓";
}

export default function Table({
  columns = [],
  rows = [],
  empty = "No rows",
  rowKey,
  stickyLeft = 0,
  stickyRight = false,
  embedded = false,
  sortBy = null,
  sortDir = "asc",
  onSort = null,
}) {
  const wrapRef = useRef(null);
  const count = stickyCount(stickyLeft);
  const layouts = columns.map(resolveColumn);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || count < 2) return undefined;
    const first = wrap.querySelector("th:first-child");
    if (!first) return undefined;

    const apply = () => {
      wrap.style.setProperty("--jd-sticky-col1", `${first.offsetWidth}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(first);
    return () => {
      observer.disconnect();
      wrap.style.removeProperty("--jd-sticky-col1");
    };
  }, [count, columns, rows]);

  const wrapClass = [
    "jd-tbl-wrap",
    count === 1 ? "jd-tbl-wrap--sticky-1" : "",
    count === 2 ? "jd-tbl-wrap--sticky-2" : "",
    stickyRight ? "jd-tbl-wrap--sticky-right" : "",
    embedded ? "jd-tbl-wrap--embedded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={wrapRef} className={wrapClass}>
      <table className="jd-tbl">
        <colgroup>
          {layouts.map((layout, i) => (
            <col
              key={columns[i].key}
              className={`jd-tbl__col jd-tbl__col--${layout.role}`}
              style={layout.width ? { width: layout.width } : undefined}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c, i) => {
              const sortKey = c.sortKey || c.key;
              const sortable = Boolean(c.sortable && onSort && sortKey);
              const active = sortable && sortBy === sortKey;
              return (
                <th
                  key={c.key}
                  scope="col"
                  className={cellClass(layouts[i])}
                  aria-sort={
                    active
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : sortable
                        ? "none"
                        : undefined
                  }
                >
                  {sortable ? (
                    <button
                      type="button"
                      className={`jd-tbl__sort${active ? " is-active" : ""}`}
                      onClick={() => onSort(sortKey)}
                    >
                      <span>{c.header}</span>
                      <span className="jd-tbl__sort-icon" aria-hidden="true">
                        {sortIndicator(active, sortDir)}
                      </span>
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {!rows.length ? (
            <tr>
              <td colSpan={columns.length} className="jd-tbl__empty">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={rowKey ? rowKey(row, i) : i}>
                {columns.map((c, ci) => (
                  <td key={c.key} className={cellClass(layouts[ci])}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
