import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCsv,
  csvCell,
  csvFilename,
  csvFormat,
  readCsvColumn,
  slugForFilename,
} from "../src/utilities/csvExport.js";

describe("csvCell", () => {
  it("quotes every cell and doubles embedded quotes", () => {
    assert.equal(csvCell('He said "hi"'), '"He said ""hi"""');
    assert.equal(csvCell(null), '""');
    assert.equal(csvCell(undefined), '""');
    assert.equal(csvCell(12.5), '"12.5"');
  });

  it("neutralises spreadsheet formula injection but keeps negative numbers", () => {
    assert.equal(csvCell("=SUM(A1:A9)"), "\"'=SUM(A1:A9)\"");
    assert.equal(csvCell("+441234"), "\"'+441234\"");
    assert.equal(csvCell("@cmd"), "\"'@cmd\"");
    assert.equal(csvCell("-12.50"), '"-12.50"');
    assert.equal(csvCell(-3), '"-3"');
  });

  it("serialises dates, arrays and objects", () => {
    assert.equal(csvCell(new Date("2026-01-02T03:04:05Z")), '"2026-01-02T03:04:05.000Z"');
    assert.equal(csvCell(["a", "b"]), '"a; b"');
    assert.equal(csvCell({ a: 1 }), '"{""a"":1}"');
  });
});

describe("buildCsv", () => {
  const columns = [
    { header: "ID", key: "id" },
    { header: "Name", value: (r) => `${r.first} ${r.last}` },
    { header: "Zone", key: "zone.name" },
  ];
  const rows = [
    { id: 1, first: "Ada", last: "Lovelace", zone: { name: "North" } },
    { id: 2, first: "Alan", last: "Turing", zone: null },
  ];

  it("writes a header row, one line per row, CRLF endings", () => {
    const csv = buildCsv(columns, rows);
    const lines = csv.split("\r\n");
    assert.equal(lines.length, 3);
    assert.equal(lines[0], '"ID","Name","Zone"');
    assert.equal(lines[1], '"1","Ada Lovelace","North"');
    assert.equal(lines[2], '"2","Alan Turing",""');
  });

  it("supports dotted keys and value accessors", () => {
    assert.equal(readCsvColumn({ key: "zone.name" }, rows[0]), "North");
    assert.equal(readCsvColumn({ key: "zone.name" }, rows[1]), undefined);
    assert.equal(readCsvColumn(columns[1], rows[1]), "Alan Turing");
  });

  it("handles an empty row set with just the header", () => {
    assert.equal(buildCsv(columns, []), '"ID","Name","Zone"');
  });
});

describe("filenames", () => {
  it("slugs unicode and punctuation", () => {
    assert.equal(slugForFilename("Customers – Zürich / North"), "customers-zurich-north");
  });

  it("includes only active filters and a timestamp", () => {
    const name = csvFilename("orders", { status: "Pending", zone: "", search: null, blocked: true });
    assert.match(name, /^orders_status-pending_blocked_\d{8}-\d{4}\.csv$/);
  });
});

describe("csvFormat", () => {
  it("formats money to two decimals without symbols", () => {
    assert.equal(csvFormat.money("12.5"), "12.50");
    assert.equal(csvFormat.money(null), "");
    assert.equal(csvFormat.money("abc"), "");
  });

  it("formats dates as ISO day and local date-time", () => {
    assert.equal(csvFormat.date("2026-03-04T10:00:00Z"), "2026-03-04");
    assert.equal(csvFormat.date(null), "");
    assert.match(csvFormat.dateTime(new Date(2026, 2, 4, 9, 5)), /^2026-03-04 09:05$/);
  });

  it("formats booleans and lists", () => {
    assert.equal(csvFormat.bool(true), "Yes");
    assert.equal(csvFormat.bool(0, "Active", "Blocked"), "Blocked");
    assert.equal(csvFormat.list(["a", null, "b"]), "a; b");
  });
});
