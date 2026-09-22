import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const url = process.env.TURSO_DATABASE_URL || `file:${path.join(dataDir, 'escala_cbmrs.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

export const db = createClient({
  url,
  authToken,
});

export async function initDatabase() {
  // 1. Create Units Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      city TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // 2. Create tables with unit_id support
  await db.execute(`
    CREATE TABLE IF NOT EXISTS personnel (
      id TEXT PRIMARY KEY,
      unit_id TEXT DEFAULT 'pelbm_ijui',
      rank TEXT NOT NULL,
      war_name TEXT NOT NULL,
      matricula TEXT,
      role TEXT,
      is_commander INTEGER DEFAULT 0,
      status TEXT DEFAULT 'ATIVO',
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS month_configs (
      unit_id TEXT DEFAULT 'pelbm_ijui',
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      base_hours INTEGER NOT NULL,
      max_overtime_sgt INTEGER DEFAULT 24,
      max_overtime_sd INTEGER DEFAULT 48,
      max_weekends INTEGER DEFAULT 3,
      daily_required_staff TEXT,
      last_month_day31_workers TEXT,
      PRIMARY KEY (unit_id, year, month)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS schedules (
      unit_id TEXT DEFAULT 'pelbm_ijui',
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      day INTEGER NOT NULL,
      militar_id TEXT NOT NULL,
      shift_code TEXT NOT NULL,
      PRIMARY KEY (unit_id, year, month, day, militar_id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS permutas (
      id TEXT PRIMARY KEY,
      unit_id TEXT DEFAULT 'pelbm_ijui',
      militar_a_id TEXT NOT NULL,
      day_a INTEGER NOT NULL,
      militar_b_id TEXT NOT NULL,
      day_b INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      status TEXT DEFAULT 'APROVADA',
      created_at TEXT NOT NULL
    );
  `);

  // 3. Safe migrations for existing SQLite databases (adding unit_id if missing)
  const addColumnSafe = async (tableName, columnName, defSql) => {
    try {
      const info = await db.execute(`PRAGMA table_info(${tableName})`);
      const exists = info.rows.some(r => String(r.name).toLowerCase() === columnName.toLowerCase());
      if (!exists) {
        await db.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${defSql}`);
      }
    } catch (_err) {
      // Column might already exist or table created with it
    }

  };

  await addColumnSafe('personnel', 'unit_id', "TEXT DEFAULT 'pelbm_ijui'");
  await addColumnSafe('month_configs', 'unit_id', "TEXT DEFAULT 'pelbm_ijui'");
  await addColumnSafe('schedules', 'unit_id', "TEXT DEFAULT 'pelbm_ijui'");
  await addColumnSafe('permutas', 'unit_id', "TEXT DEFAULT 'pelbm_ijui'");

  // Fix any NULL unit_id in existing data
  await db.execute("UPDATE personnel SET unit_id = 'pelbm_ijui' WHERE unit_id IS NULL OR unit_id = ''");
  await db.execute("UPDATE month_configs SET unit_id = 'pelbm_ijui' WHERE unit_id IS NULL OR unit_id = ''");
  await db.execute("UPDATE schedules SET unit_id = 'pelbm_ijui' WHERE unit_id IS NULL OR unit_id = ''");
  await db.execute("UPDATE permutas SET unit_id = 'pelbm_ijui' WHERE unit_id IS NULL OR unit_id = ''");

  // 4. Seed default units if empty
  const unitsRes = await db.execute('SELECT COUNT(*) as count FROM units');
  const unitCount = Number(unitsRes.rows[0]?.count || 0);

  if (unitCount === 0) {
    console.log('🌱 Populando unidades padrão do CBMRS...');
    const defaultUnits = [
      { id: 'pelbm_ijui', name: '1º Pelotão de Bombeiro Militar', code: '1º PelBM', city: 'Ijuí/RS', created_at: new Date().toISOString() },
      { id: 'pelbm_panambi', name: '2º Pelotão de Bombeiro Militar', code: '2º PelBM', city: 'Panambi/RS', created_at: new Date().toISOString() },
      { id: 'pelbm_cruz_alta', name: 'Pelotão de Bombeiro Militar', code: 'PelBM Cruz Alta', city: 'Cruz Alta/RS', created_at: new Date().toISOString() },
    ];

    for (const u of defaultUnits) {
      await db.execute({
        sql: 'INSERT INTO units (id, name, code, city, created_at) VALUES (?, ?, ?, ?, ?)',
        args: [u.id, u.name, u.code, u.city, u.created_at]
      });
    }
  }

  // 5. Seed default 21 firefighters from Ijuí if empty
  const countRes = await db.execute("SELECT COUNT(*) as count FROM personnel WHERE unit_id = 'pelbm_ijui'");
  const count = Number(countRes.rows[0]?.count || 0);

  if (count === 0) {
    console.log('🌱 Populando efetivo inicial do 1º PelBM Ijuí...');
    const defaultPersonnel = [
      { id: '1', unit_id: 'pelbm_ijui', rank: '1º Tenente', war_name: 'AGNOLETTO', matricula: '4219082', role: 'Comandante', is_commander: 1, status: 'ATIVO', is_active: 1, sort_order: 1 },
      { id: '2', unit_id: 'pelbm_ijui', rank: '1º Sargento', war_name: 'VICTOR', matricula: '4218736', role: 'Chefe de Socorro', is_commander: 0, status: 'ATIVO', is_active: 1, sort_order: 2 },
      { id: '3', unit_id: 'pelbm_ijui', rank: '2º Sargento', war_name: 'KOMMERS', matricula: '4215540', role: 'Chefe de Socorro', is_commander: 0, status: 'ATIVO', is_active: 1, sort_order: 3 },
      { id: '4', unit_id: 'pelbm_ijui', rank: '2º Sargento', war_name: 'JARBAS', matricula: '4217892', role: 'Chefe de Socorro', is_commander: 0, status: 'ATIVO', is_active: 1, sort_order: 4 },
      { id: '5', unit_id: 'pelbm_ijui', rank: '2º Sargento', war_name: 'KRAEMER', matricula: '4216631', role: 'Chefe de Socorro', is_commander: 0, status: 'ATIVO', is_active: 1, sort_order: 5 },
      { id: '6', unit_id: 'pelbm_ijui', rank: '3º Sargento', war_name: 'DIEISON', matricula: '4214432', role: 'Chefe de Socorro', is_commander: 0, status: 'ATIVO', is_active: 1, sort_order: 6 },
      { id: '7', unit_id: 'pelbm_ijui', rank: '3º Sargento', war_name: 'ANDREWS', matricula: '4219901', role: 'Chefe de Socorro', is_commander: 0, status: 'ATIVO', is_active: 1, sort_order: 7 },
      { id: '8', unit_id: 'pelbm_ijui', rank: '3º Sargento', war_name: 'MARCELO', matricula: '4218821', role: 'Sargenteante', is_commander: 0, status: 'ATIVO', is_active: 1, sort_order: 8 },
      { id: '9', unit_id: 'pelbm_ijui', rank: 'SOLDADO', war_name: 'VEIGA', matricula: '4321102', role: 'Motorista', is_commander: 0, status: 'ATIVO', is_active: 1, sort_order: 9 },
      { id: '10', unit_id: 'pelbm_ijui', rank: 'SOLDADO', war_name: 'KREUTZ', matricula: '4321199', role: 'Motorista', is_commander: 0, status: 'ATIVO', is_active: 1, sort_order: 10 },
      { id: '11', unit_id: 'pelbm_ijui', rank: 'SOLDADO', war_name: 'DREWS', matricula: '4321554', role: 'Motorista', is_commander: 0, status: 'ATIVO', is_active: 1, sort_order: 11 },
      { id: '12', unit_id: 'pelbm_ijui', rank: 'SOLDADO', war_name: 'MARIANO', matricula: '4321440', role: 'Motorista', is_commander: 0, status: 'ATIVO', is_active: 1, sort_order: 12 },
      { id: '13', unit_id: 'pelbm_ijui', rank: 'SOLDADO', war_name: 'RITTER', matricula: '4321876', role: 'Motorista', is_commander: 0, status: 'ATIVO', is_active: 1, sort_order: 13 },
      { id: '14', unit_id: 'pelbm_ijui', rank: 'SOLDADO', war_name: 'SANTOS', matricula: '4321765', role: 'Socorrista', is_commander: 0, status: 'ATIVO', is_active: 1, sort_order: 14 },
      { id: '15', unit_id: 'pelbm_ijui', rank: 'SOLDADO', war_name: 'ERIK', matricula: '4321332', role: 'Socorrista', is_commander: 0, status: 'ATIVO', is_active: 1, sort_order: 15 },
      { id: '16', unit_id: 'pelbm_ijui', rank: 'SOLDADO', war_name: 'CARVALHO', matricula: '4321901', role: 'Socorrista', is_commander: 0, status: 'ATIVO', is_active: 1, sort_order: 16 },
      { id: '17', unit_id: 'pelbm_ijui', rank: 'SOLDADO', war_name: 'LUCAS', matricula: '4321888', role: 'Socorrista', is_commander: 0, status: 'ATIVO', is_active: 1, sort_order: 17 },
      { id: '18', unit_id: 'pelbm_ijui', rank: 'SOLDADO', war_name: 'DHEIN', matricula: '4321550', role: 'Socorrista', is_commander: 0, status: 'ATIVO', is_active: 1, sort_order: 18 },
      { id: '19', unit_id: 'pelbm_ijui', rank: 'SOLDADO', war_name: 'BARCELLOS', matricula: '4321664', role: 'Socorrista', is_commander: 0, status: 'ATIVO', is_active: 1, sort_order: 19 },
      { id: '20', unit_id: 'pelbm_ijui', rank: 'SOLDADO', war_name: 'SILVA', matricula: '4321221', role: 'Socorrista', is_commander: 0, status: 'ATIVO', is_active: 1, sort_order: 20 },
      { id: '21', unit_id: 'pelbm_ijui', rank: 'SOLDADO', war_name: 'CZYZEWSKI', matricula: '4321998', role: 'Socorrista', is_commander: 0, status: 'ATIVO', is_active: 1, sort_order: 21 }
    ];

    const statements = defaultPersonnel.map(p => ({
      sql: `INSERT INTO personnel (id, unit_id, rank, war_name, matricula, role, is_commander, status, is_active, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [p.id, p.unit_id, p.rank, p.war_name, p.matricula, p.role, p.is_commander, p.status, p.is_active, p.sort_order]
    }));

    await db.batch(statements);
  }

  // 6. Seed default October 2026 config & initial vacations for Ijuí if empty
  const configRes = await db.execute({
    sql: "SELECT COUNT(*) as count FROM month_configs WHERE unit_id = 'pelbm_ijui' AND year = 2026 AND month = 10",
    args: []
  });

  if (Number(configRes.rows[0]?.count || 0) === 0) {
    console.log('🌱 Populando configuração inicial de Outubro/2026 para o 1º PelBM Ijuí...');
    const initialRequired = {};
    for (let d = 1; d <= 31; d++) {
      const dow = new Date(2026, 9, d).getDay();
      initialRequired[d] = (dow === 0 || dow === 6) ? 5 : 4;
    }

    await db.execute({
      sql: `INSERT OR REPLACE INTO month_configs (unit_id, year, month, base_hours, max_overtime_sgt, max_overtime_sd, max_weekends, daily_required_staff, last_month_day31_workers)
            VALUES ('pelbm_ijui', 2026, 10, 177, 24, 48, 3, ?, ?)`,
      args: [
        JSON.stringify(initialRequired),
        JSON.stringify(['KOMMERS', 'DIEISON', 'ERIK'])
      ]
    });

    const shiftStatements = [];
    for (let d = 1; d <= 10; d++) shiftStatements.push({ sql: "INSERT OR REPLACE INTO schedules (unit_id, year, month, day, militar_id, shift_code) VALUES ('pelbm_ijui', 2026, 10, ?, ?, ?)", args: [d, '1', 'FER'] });
    shiftStatements.push({ sql: "INSERT OR REPLACE INTO schedules (unit_id, year, month, day, militar_id, shift_code) VALUES ('pelbm_ijui', 2026, 10, 1, '8', 'OS12')", args: [] });
    shiftStatements.push({ sql: "INSERT OR REPLACE INTO schedules (unit_id, year, month, day, militar_id, shift_code) VALUES ('pelbm_ijui', 2026, 10, 2, '8', 'OS12')", args: [] });
    for (let d = 3; d <= 23; d++) shiftStatements.push({ sql: "INSERT OR REPLACE INTO schedules (unit_id, year, month, day, militar_id, shift_code) VALUES ('pelbm_ijui', 2026, 10, ?, '8', 'FER')", args: [d] });
    for (let d = 16; d <= 30; d++) shiftStatements.push({ sql: "INSERT OR REPLACE INTO schedules (unit_id, year, month, day, militar_id, shift_code) VALUES ('pelbm_ijui', 2026, 10, ?, '13', 'FER')", args: [d] });
    for (let d = 15; d <= 19; d++) shiftStatements.push({ sql: "INSERT OR REPLACE INTO schedules (unit_id, year, month, day, militar_id, shift_code) VALUES ('pelbm_ijui', 2026, 10, ?, '16', 'RSP')", args: [d] });
    for (let d = 22; d <= 31; d++) shiftStatements.push({ sql: "INSERT OR REPLACE INTO schedules (unit_id, year, month, day, militar_id, shift_code) VALUES ('pelbm_ijui', 2026, 10, ?, '17', 'FER')", args: [d] });
    for (let d = 1; d <= 20; d++) shiftStatements.push({ sql: "INSERT OR REPLACE INTO schedules (unit_id, year, month, day, militar_id, shift_code) VALUES ('pelbm_ijui', 2026, 10, ?, '18', 'FER')", args: [d] });
    for (let d = 5; d <= 18; d++) shiftStatements.push({ sql: "INSERT OR REPLACE INTO schedules (unit_id, year, month, day, militar_id, shift_code) VALUES ('pelbm_ijui', 2026, 10, ?, '21', 'FER')", args: [d] });

    [1, 2, 5, 6, 7, 8, 9].forEach(d => {
      shiftStatements.push({ sql: "INSERT OR REPLACE INTO schedules (unit_id, year, month, day, militar_id, shift_code) VALUES ('pelbm_ijui', 2026, 10, ?, '2', 'EXP6')", args: [d] });
    });

    await db.batch(shiftStatements);
  }
}

export default db;

