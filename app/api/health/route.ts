import path from 'node:path';
import Database from 'better-sqlite3';

export async function GET() {
  const dbPath =
    process.env.SQLITE_PATH ?? path.join(process.cwd(), 'data', 'sqlite.db');
  try {
    const sqlite = new Database(dbPath, {
      readonly: true,
      fileMustExist: true,
    });
    sqlite.prepare('SELECT 1').get();
    sqlite.close();
    return Response.json({ status: 'ok' }, { status: 200 });
  } catch {
    return Response.json({ status: 'error' }, { status: 503 });
  }
}
