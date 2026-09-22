import express from 'express';
import cors from 'cors';
import db, { initDatabase } from './db.js';

export const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize DB schema & seed data
initDatabase().catch(err => {
  console.error('❌ Erro ao inicializar banco de dados SQLite / Turso:', err);
});

// Health check & DB Stats
app.get('/api/health', async (req, res) => {
  try {
    const isTurso = Boolean(process.env.TURSO_DATABASE_URL);
    const pCount = await db.execute('SELECT COUNT(*) as count FROM personnel');
    const sCount = await db.execute('SELECT COUNT(*) as count FROM schedules');
    res.json({
      status: 'online',
      database: isTurso ? 'Turso Cloud SQLite (LibSQL)' : 'SQLite Local (LibSQL)',
      databaseUrl: isTurso ? process.env.TURSO_DATABASE_URL : 'file:data/escala_cbmrs.db',
      stats: {
        totalPersonnel: Number(pCount.rows[0]?.count || 0),
        totalScheduledShifts: Number(sCount.rows[0]?.count || 0)
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// ==========================================
// UNITS ROUTES
// ==========================================

// GET all units
app.get('/api/units', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM units ORDER BY name ASC');
    const units = result.rows.map(r => ({
      id: String(r.id),
      name: String(r.name),
      code: String(r.code),
      city: String(r.city),
      createdAt: String(r.created_at || '')
    }));
    res.json(units);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add new unit
app.post('/api/units', async (req, res) => {
  try {
    const { id, name, code, city } = req.body;
    if (!name || !code || !city) {
      return res.status(400).json({ error: 'Nome, sigla e cidade são obrigatórios.' });
    }

    const newId = id || `unit_${Date.now()}`;
    const createdAt = new Date().toISOString();

    await db.execute({
      sql: 'INSERT INTO units (id, name, code, city, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [newId, name.trim(), code.trim(), city.trim(), createdAt]
    });

    const newUnit = { id: newId, name: name.trim(), code: code.trim(), city: city.trim(), createdAt };
    res.status(201).json({ success: true, unit: newUnit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update unit
app.put('/api/units/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, city } = req.body;

    await db.execute({
      sql: 'UPDATE units SET name = ?, code = ?, city = ? WHERE id = ?',
      args: [name.trim(), code.trim(), city.trim(), id]
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE remove unit and its associated records
app.delete('/api/units/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const countRes = await db.execute('SELECT COUNT(*) as count FROM units');
    const totalUnits = Number(countRes.rows[0]?.count || 0);
    if (totalUnits <= 1) {
      return res.status(400).json({ error: 'Não é possível excluir a única unidade cadastrada.' });
    }

    const batch = [
      { sql: 'DELETE FROM units WHERE id = ?', args: [id] },
      { sql: 'DELETE FROM personnel WHERE unit_id = ?', args: [id] },
      { sql: 'DELETE FROM schedules WHERE unit_id = ?', args: [id] },
      { sql: 'DELETE FROM month_configs WHERE unit_id = ?', args: [id] },
      { sql: 'DELETE FROM permutas WHERE unit_id = ?', args: [id] }
    ];

    await db.batch(batch);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PERSONNEL ROUTES
// ==========================================

// GET all personnel for a unit ordered by seniority
app.get('/api/personnel', async (req, res) => {
  try {
    const unitId = req.query.unitId ? String(req.query.unitId) : 'pelbm_ijui';
    const result = await db.execute({
      sql: 'SELECT * FROM personnel WHERE unit_id = ? ORDER BY sort_order ASC',
      args: [unitId]
    });

    const formatted = result.rows.map(r => ({
      id: String(r.id),
      unitId: String(r.unit_id || unitId),
      rank: String(r.rank),
      warName: String(r.war_name),
      matricula: String(r.matricula || ''),
      role: String(r.role || 'Operacional'),
      isCommander: Boolean(r.is_commander),
      status: String(r.status || 'ATIVO'),
      isActive: Boolean(r.is_active)
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add new militar (with targetIndex & unitId)
app.post('/api/personnel', async (req, res) => {
  try {
    const { id, unitId = 'pelbm_ijui', rank, warName, matricula, role, isCommander, status, isActive, targetIndex } = req.body;
    const newId = id || String(Date.now());

    const allRes = await db.execute({
      sql: 'SELECT id, sort_order FROM personnel WHERE unit_id = ? ORDER BY sort_order ASC',
      args: [unitId]
    });
    const allPersonnel = allRes.rows;
    let insertIndex = typeof targetIndex === 'number' && targetIndex >= 0 ? targetIndex : allPersonnel.length;

    const batch = [];
    for (let i = insertIndex; i < allPersonnel.length; i++) {
      batch.push({
        sql: 'UPDATE personnel SET sort_order = ? WHERE id = ? AND unit_id = ?',
        args: [i + 2, allPersonnel[i].id, unitId]
      });
    }

    batch.push({
      sql: `INSERT INTO personnel (id, unit_id, rank, war_name, matricula, role, is_commander, status, is_active, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        newId,
        unitId,
        rank,
        warName.trim().toUpperCase(),
        matricula ? matricula.trim() : '',
        role || 'Operacional',
        isCommander ? 1 : 0,
        status || 'ATIVO',
        isActive !== false ? 1 : 0,
        insertIndex + 1
      ]
    });

    await db.batch(batch);
    res.status(201).json({ success: true, id: newId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update militar
app.put('/api/personnel/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { unitId, rank, warName, matricula, role, isCommander, status, isActive, targetIndex } = req.body;

    const currentMilitarRes = await db.execute({
      sql: 'SELECT unit_id FROM personnel WHERE id = ?',
      args: [id]
    });
    const activeUnitId = unitId || currentMilitarRes.rows[0]?.unit_id || 'pelbm_ijui';

    const batch = [
      {
        sql: `UPDATE personnel
              SET rank = ?, war_name = ?, matricula = ?, role = ?, is_commander = ?, status = ?, is_active = ?
              WHERE id = ?`,
        args: [
          rank,
          warName.trim().toUpperCase(),
          matricula ? matricula.trim() : '',
          role || 'Operacional',
          isCommander ? 1 : 0,
          status || 'ATIVO',
          isActive !== false ? 1 : 0,
          id
        ]
      }
    ];

    if (typeof targetIndex === 'number') {
      const allRes = await db.execute({
        sql: 'SELECT id FROM personnel WHERE unit_id = ? ORDER BY sort_order ASC',
        args: [activeUnitId]
      });
      const all = allRes.rows.map(r => String(r.id));
      const currentIdx = all.findIndex(pId => pId === id);
      if (currentIdx !== -1 && currentIdx !== targetIndex) {
        const [moved] = all.splice(currentIdx, 1);
        all.splice(targetIndex, 0, moved);

        all.forEach((pId, idx) => {
          batch.push({
            sql: 'UPDATE personnel SET sort_order = ? WHERE id = ?',
            args: [idx + 1, pId]
          });
        });
      }
    }

    await db.batch(batch);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE remove militar
app.delete('/api/personnel/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const militarRes = await db.execute({
      sql: 'SELECT unit_id FROM personnel WHERE id = ?',
      args: [id]
    });
    const unitId = militarRes.rows[0]?.unit_id || 'pelbm_ijui';

    const allRes = await db.execute({
      sql: 'SELECT id FROM personnel WHERE id != ? AND unit_id = ? ORDER BY sort_order ASC',
      args: [id, unitId]
    });
    const remaining = allRes.rows.map(r => String(r.id));

    const batch = [
      { sql: 'DELETE FROM personnel WHERE id = ?', args: [id] },
      { sql: 'DELETE FROM schedules WHERE militar_id = ?', args: [id] }
    ];

    remaining.forEach((pId, idx) => {
      batch.push({
        sql: 'UPDATE personnel SET sort_order = ? WHERE id = ?',
        args: [idx + 1, pId]
      });
    });

    await db.batch(batch);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST reorder personnel
app.post('/api/personnel/reorder', async (req, res) => {
  try {
    const { startIndex, endIndex, unitId = 'pelbm_ijui' } = req.body;
    const allRes = await db.execute({
      sql: 'SELECT id FROM personnel WHERE unit_id = ? ORDER BY sort_order ASC',
      args: [unitId]
    });
    const all = allRes.rows.map(r => String(r.id));

    if (startIndex >= 0 && startIndex < all.length && endIndex >= 0 && endIndex < all.length) {
      const [moved] = all.splice(startIndex, 1);
      all.splice(endIndex, 0, moved);

      const batch = all.map((pId, idx) => ({
        sql: 'UPDATE personnel SET sort_order = ? WHERE id = ?',
        args: [idx + 1, pId]
      }));

      await db.batch(batch);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST reset to default firefighters
app.post('/api/personnel/reset', async (req, res) => {
  try {
    const unitId = req.query.unitId ? String(req.query.unitId) : 'pelbm_ijui';
    await db.execute({
      sql: 'DELETE FROM personnel WHERE unit_id = ?',
      args: [unitId]
    });
    await initDatabase();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SCHEDULE & CONFIG ROUTES
// ==========================================

// GET schedule & month config
app.get('/api/schedule/:year/:month', async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const unitId = req.query.unitId ? String(req.query.unitId) : 'pelbm_ijui';
    const numDays = new Date(year, month, 0).getDate();

    const configRes = await db.execute({
      sql: 'SELECT * FROM month_configs WHERE unit_id = ? AND year = ? AND month = ?',
      args: [unitId, year, month]
    });

    let configRow = configRes.rows[0];

    if (!configRow) {
      const baseHours = numDays === 31 ? 177 : numDays === 30 ? 171 : 165;
      const initialRequired = {};
      for (let d = 1; d <= numDays; d++) {
        const dow = new Date(year, month - 1, d).getDay();
        initialRequired[d] = (dow === 0 || dow === 6) ? 5 : 4;
      }

      await db.execute({
        sql: `INSERT OR REPLACE INTO month_configs (unit_id, year, month, base_hours, max_overtime_sgt, max_overtime_sd, max_weekends, daily_required_staff, last_month_day31_workers)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          unitId,
          year,
          month,
          baseHours,
          24,
          48,
          3,
          JSON.stringify(initialRequired),
          JSON.stringify(['KOMMERS', 'DIEISON', 'ERIK'])
        ]
      });

      configRow = {
        unit_id: unitId,
        year,
        month,
        base_hours: baseHours,
        max_overtime_sgt: 24,
        max_overtime_sd: 48,
        max_weekends: 3,
        daily_required_staff: JSON.stringify(initialRequired),
        last_month_day31_workers: JSON.stringify(['KOMMERS', 'DIEISON', 'ERIK'])
      };
    }

    const config = {
      unitId: String(configRow.unit_id || unitId),
      year: Number(configRow.year),
      month: Number(configRow.month),
      numDays,
      baseHours: Number(configRow.base_hours),
      maxOvertimeSgt: Number(configRow.max_overtime_sgt),
      maxOvertimeSd: Number(configRow.max_overtime_sd),
      maxWeekends: Number(configRow.max_weekends),
      dailyRequiredStaff: JSON.parse(String(configRow.daily_required_staff || '{}')),
      lastMonthDay31Workers: JSON.parse(String(configRow.last_month_day31_workers || '[]'))
    };

    const schedRes = await db.execute({
      sql: 'SELECT day, militar_id, shift_code FROM schedules WHERE unit_id = ? AND year = ? AND month = ?',
      args: [unitId, year, month]
    });

    const schedule = {};
    for (let d = 1; d <= numDays; d++) schedule[d] = {};

    schedRes.rows.forEach(r => {
      const d = Number(r.day);
      const mId = String(r.militar_id);
      const code = String(r.shift_code || '');
      if (!schedule[d]) schedule[d] = {};
      if (code) {
        schedule[d][mId] = code;
      }
    });

    res.json({ config, schedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST update single cell
app.post('/api/schedule/:year/:month/cell', async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const { day, militarId, code, unitId = 'pelbm_ijui' } = req.body;

    if (!code) {
      await db.execute({
        sql: 'DELETE FROM schedules WHERE unit_id = ? AND year = ? AND month = ? AND day = ? AND militar_id = ?',
        args: [unitId, year, month, day, militarId]
      });
    } else {
      await db.execute({
        sql: `INSERT OR REPLACE INTO schedules (unit_id, year, month, day, militar_id, shift_code)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [unitId, year, month, day, militarId, code]
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST bulk update schedule (e.g. after auto scheduler or clear)
app.post('/api/schedule/:year/:month/bulk', async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const { schedule, unitId = 'pelbm_ijui' } = req.body;

    const batch = [
      {
        sql: 'DELETE FROM schedules WHERE unit_id = ? AND year = ? AND month = ?',
        args: [unitId, year, month]
      }
    ];

    for (const [dayStr, militarMap] of Object.entries(schedule)) {
      const day = parseInt(dayStr, 10);
      for (const [militarId, code] of Object.entries(militarMap)) {
        if (code) {
          batch.push({
            sql: `INSERT INTO schedules (unit_id, year, month, day, militar_id, shift_code)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [unitId, year, month, day, militarId, code]
          });
        }
      }
    }

    await db.batch(batch);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update month config
app.put('/api/config/:year/:month', async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const { baseHours, maxOvertimeSgt, maxOvertimeSd, maxWeekends, dailyRequiredStaff, lastMonthDay31Workers, unitId = 'pelbm_ijui' } = req.body;

    await db.execute({
      sql: `INSERT OR REPLACE INTO month_configs (unit_id, year, month, base_hours, max_overtime_sgt, max_overtime_sd, max_weekends, daily_required_staff, last_month_day31_workers)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        unitId,
        year,
        month,
        baseHours,
        maxOvertimeSgt,
        maxOvertimeSd,
        maxWeekends,
        JSON.stringify(dailyRequiredStaff || {}),
        JSON.stringify(lastMonthDay31Workers || [])
      ]
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create permuta
app.post('/api/permutas', async (req, res) => {
  try {
    const { militarAId, dayA, militarBId, dayB, month, year, unitId = 'pelbm_ijui' } = req.body;
    const permutaId = String(Date.now());

    const shiftARes = await db.execute({
      sql: 'SELECT shift_code FROM schedules WHERE unit_id = ? AND year = ? AND month = ? AND day = ? AND militar_id = ?',
      args: [unitId, year, month, dayA, militarAId]
    });
    const shiftA = shiftARes.rows[0]?.shift_code ? String(shiftARes.rows[0].shift_code) : 'J';

    const shiftBRes = await db.execute({
      sql: 'SELECT shift_code FROM schedules WHERE unit_id = ? AND year = ? AND month = ? AND day = ? AND militar_id = ?',
      args: [unitId, year, month, dayB, militarBId]
    });
    const shiftB = shiftBRes.rows[0]?.shift_code ? String(shiftBRes.rows[0].shift_code) : 'J';

    const batch = [
      {
        sql: `INSERT INTO permutas (id, unit_id, militar_a_id, day_a, militar_b_id, day_b, month, year, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'APROVADA', ?)`,
        args: [permutaId, unitId, militarAId, dayA, militarBId, dayB, month, year, new Date().toISOString()]
      },
      {
        sql: 'DELETE FROM schedules WHERE unit_id = ? AND year = ? AND month = ? AND day = ? AND militar_id = ?',
        args: [unitId, year, month, dayA, militarAId]
      },
      {
        sql: 'INSERT OR REPLACE INTO schedules (unit_id, year, month, day, militar_id, shift_code) VALUES (?, ?, ?, ?, ?, ?)',
        args: [unitId, year, month, dayA, militarBId, shiftA]
      },
      {
        sql: 'DELETE FROM schedules WHERE unit_id = ? AND year = ? AND month = ? AND day = ? AND militar_id = ?',
        args: [unitId, year, month, dayB, militarBId]
      },
      {
        sql: 'INSERT OR REPLACE INTO schedules (unit_id, year, month, day, militar_id, shift_code) VALUES (?, ?, ?, ?, ?, ?)',
        args: [unitId, year, month, dayB, militarAId, shiftB]
      }
    ];

    await db.batch(batch);
    res.status(201).json({ success: true, id: permutaId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start listening if executed directly (not in Vercel serverless mode)
if (process.env.NODE_ENV !== 'production' || process.env.RUN_STANDALONE === 'true') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CBMRS Escala Server rodando em http://localhost:${PORT}`);
  });
}

export default app;

