// supabase/functions/_shared/merge.ts
// scripts/build-members-enc.mjs 의 mergeMembers 를 그대로 포팅. 행 인덱스 규약 동일.
export function normalizeCohort(c: unknown): string {
  const s = (c == null ? "" : String(c)).trim();
  return /^\d$/.test(s) ? s.padStart(2, "0") : s;
}

export function memberKey(name: unknown, cohort: unknown): string {
  return `${(name == null ? "" : String(name)).trim()}|${normalizeCohort(cohort)}`;
}

function parseTimestamp(ts: unknown): number | null {
  const t = Date.parse(String(ts == null ? "" : ts));
  return Number.isNaN(t) ? null : t;
}

function cell(row: string[], idx: number): string {
  const v = row[idx];
  return v == null ? "" : String(v);
}

export function mergeMembers(
  memberDataRows: string[][],
  responseDataRows: string[][],
): string[][] {
  const members = memberDataRows.map((r) => {
    const row: string[] = [];
    for (let i = 0; i < 8; i++) row.push(cell(r, i));
    return row;
  });

  const memberIndexByKey = new Map<string, number>();
  members.forEach((r, i) => {
    if (r[0]) memberIndexByKey.set(memberKey(r[0], r[1]), i);
  });

  const validResponses = responseDataRows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => cell(r, 7).trim().startsWith("동의"));

  validResponses.sort((a, b) => {
    const ta = parseTimestamp(a.r[0]);
    const tb = parseTimestamp(b.r[0]);
    if (ta !== null && tb !== null && ta !== tb) return ta - tb;
    if (ta !== null && tb === null) return -1;
    if (ta === null && tb !== null) return 1;
    return a.i - b.i;
  });

  const finalByKey = new Map<string, string[]>();
  for (const { r } of validResponses) {
    const name = cell(r, 2);
    if (!name.trim()) continue;
    finalByKey.set(memberKey(name, cell(r, 1)), r);
  }

  const excludedKeys = new Set<string>();
  const newRows: string[][] = [];

  for (const [key, r] of finalByKey) {
    const visibility = cell(r, 6);
    if (visibility.includes("비공개")) {
      excludedKeys.add(key);
      continue;
    }
    const name = cell(r, 2).trim();
    const cohort = normalizeCohort(cell(r, 1));
    const phone = cell(r, 3).trim();
    const email = cell(r, 4).trim();
    const org = cell(r, 10).trim();
    const quote = cell(r, 5).trim();

    if (memberIndexByKey.has(key)) {
      const row = members[memberIndexByKey.get(key)!];
      row[3] = email || row[3];
      row[4] = phone || row[4];
      row[2] = org || row[2];
      row[6] = quote || row[6];
    } else {
      newRows.push([name, cohort, org, email, phone, "", quote, ""]);
    }
  }

  let finalRows = members.filter((r) => !excludedKeys.has(memberKey(r[0], r[1])));
  finalRows = finalRows.concat(newRows);

  const chronoYear = (n: number) => (n >= 80 ? 1900 + n : 2000 + n);
  finalRows.sort((a, b) => {
    const ca = normalizeCohort(a[1]);
    const cb = normalizeCohort(b[1]);
    const na = /^\d+$/.test(ca) ? chronoYear(parseInt(ca, 10)) : null;
    const nb = /^\d+$/.test(cb) ? chronoYear(parseInt(cb, 10)) : null;
    if (na !== null && nb !== null && na !== nb) return na - nb;
    if (na !== null && nb === null) return -1;
    if (na === null && nb !== null) return 1;
    if (ca !== cb) return ca < cb ? -1 : 1;
    return (a[0] || "").localeCompare(b[0] || "", "ko");
  });

  return finalRows;
}
