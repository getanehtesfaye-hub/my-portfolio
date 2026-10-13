import { query } from "../db/pool";

type Row = Record<string, unknown>;

// Table and column names come from code (zod schema keys), never from requests. Values are always parameterised.
export function crudRepo(table: string, cols: string[]) {
  const pick = (b: Row) => cols.filter((c) => b[c] !== undefined);
  return {
    list: (where?: string) => query<Row>(`select * from ${table} ${where ? `where ${where}` : ""} order by sort_order, created_at`),
    async create(b: Row) {
      const k = pick(b);
      const sql = k.length
        ? `insert into ${table} (${k.join(",")}) values (${k.map((_, i) => `$${i + 1}`).join(",")}) returning *`
        : `insert into ${table} default values returning *`;
      return (await query<Row>(sql, k.map((c) => b[c])))[0];
    },
    async update(id: string, b: Row) {
      const k = pick(b);
      if (!k.length) return undefined;
      const sql = `update ${table} set ${k.map((c, i) => `${c}=$${i + 1}`).join(",")} where id=$${k.length + 1} returning *`;
      return (await query<Row>(sql, [...k.map((c) => b[c]), id]))[0];
    },
    async remove(id: string) {
      return (await query<Row>(`delete from ${table} where id=$1 returning id`, [id])).length > 0;
    },
    reorder: (ids: string[]) =>
      query(`update ${table} t set sort_order = v.ord from unnest($1::uuid[]) with ordinality as v(id, ord) where t.id = v.id`, [ids]),
  };
}
