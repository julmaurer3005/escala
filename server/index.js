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
// PERSONNEL ROUTES
// ==========================================

// GET all personnel ordered by seniority
app.get('/api/personnel', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM personnel ORDER BY sort_order ASC');
    const formatted = result.rows.map(r => ({
      id: String(r.id),
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

// POST add new militar (with targetIndex)
app.post('/api/personnel', async (req, res) => {
  try {
    const { id, rank, warName, matricula, role, isCommander, status, isActive, targetIndex } = req.body;
    const newId = id || String(Date.now());

    const allRes = await db.execute('SELECT id, sort_order FROM personnel ORDER BY sort_order ASC');
    const allPersonnel = allRes.rows;
    let insertIndex = typeof targetIndex === 'number' && targetIndex >= 0 ? targetIndex : allPersonnel.length;

    const batch = [];
    for (let i = insertIndex; i < allPersonnel.length; i++) {
      batch.push({
        sql: 'UPDATE personnel SET sort_order = ? WHERE id = ?',
        args: [i + 2, allPersonnel[i].id]
      });
    }

    batch.push({
      sql: `INSERT INTO personnel (id, rank, war_name, matricula, role, is_commander, status, is_active, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        newId,
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
    const { rank, warName, matricula, role, isCommander, status, isActive, targetIndex } = req.body;

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
      const allRes = await db.execute('SELECT id FROM personnel ORDER BY sort_order ASC');
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

    const allRes = await db.execute({
      sql: 'SELECT id FROM personnel WHERE id != ? ORDER BY sort_order ASC',
      args: [id]
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
    const { startIndex, endIndex } = req.body;
    const allRes = await db.execute('SELECT id FROM personnel ORDER BY sort_order ASC');
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

// POST reset to default 21 firefighters
app.post('/api/personnel/reset', async (req, res) => {
  try {
    await db.execute('DELETE FROM personnel');
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
    const numDays = new Date(year, month, 0).getDate();

    const configRes = await db.execute({
      sql: 'SELECT * FROM month_configs WHERE year = ? AND month = ?',
      args: [year, month]
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
        sql: `INSERT INTO month_configs (year, month, base_hours, max_overtime_sgt, max_overtime_sd, max_weekends, daily_required_staff, last_month_day31_workers)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
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
      sql: 'SELECT day, militar_id, shift_code FROM schedules WHERE year = ? AND month = ?',
      args: [year, month]
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
    const { day, militarId, code } = req.body;

    if (!code) {
      await db.execute({
        sql: 'DELETE FROM schedules WHERE year = ? AND month = ? AND day = ? AND militar_id = ?',
        args: [year, month, day, militarId]
      });
    } else {
      await db.execute({
        sql: `INSERT OR REPLACE INTO schedules (year, month, day, militar_id, shift_code)
              VALUES (?, ?, ?, ?, ?)`,
        args: [year, month, day, militarId, code]
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST bulk update schedule (e.g. after auto scheduler)
app.post('/api/schedule/:year/:month/bulk', async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const { schedule } = req.body;

    const batch = [
      {
        sql: 'DELETE FROM schedules WHERE year = ? AND month = ?',
        args: [year, month]
      }
    ];

    for (const [dayStr, militarMap] of Object.entries(schedule)) {
      const day = parseInt(dayStr, 10);
      for (const [militarId, code] of Object.entries(militarMap)) {
        if (code) {
          batch.push({
            sql: `INSERT INTO schedules (year, month, day, militar_id, shift_code)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [year, month, day, militarId, code]
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
    const { baseHours, maxOvertimeSgt, maxOvertimeSd, maxWeekends, dailyRequiredStaff, lastMonthDay31Workers } = req.body;

    await db.execute({
      sql: `INSERT OR REPLACE INTO month_configs (year, month, base_hours, max_overtime_sgt, max_overtime_sd, max_weekends, daily_required_staff, last_month_day31_workers)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
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
    const { militarAId, dayA, militarBId, dayB, month, year } = req.body;
    const permutaId = String(Date.now());

    const shiftARes = await db.execute({
      sql: 'SELECT shift_code FROM schedules WHERE year = ? AND month = ? AND day = ? AND militar_id = ?',
      args: [year, month, dayA, militarAId]
    });
    const shiftA = shiftARes.rows[0]?.shift_code ? String(shiftARes.rows[0].shift_code) : 'J';

    const shiftBRes = await db.execute({
      sql: 'SELECT shift_code FROM schedules WHERE year = ? AND month = ? AND day = ? AND militar_id = ?',
      args: [year, month, dayB, militarBId]
    });
    const shiftB = shiftBRes.rows[0]?.shift_code ? String(shiftBRes.rows[0].shift_code) : 'J';

    const batch = [
      {
        sql: `INSERT INTO permutas (id, militar_a_id, day_a, militar_b_id, day_b, month, year, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'APROVADA', ?)`,
        args: [permutaId, militarAId, dayA, militarBId, dayB, month, year, new Date().toISOString()]
      },
      {
        sql: 'DELETE FROM schedules WHERE year = ? AND month = ? AND day = ? AND militar_id = ?',
        args: [year, month, dayA, militarAId]
      },
      {
        sql: 'INSERT OR REPLACE INTO schedules (year, month, day, militar_id, shift_code) VALUES (?, ?, ?, ?, ?)',
        args: [year, month, dayA, militarBId, shiftA]
      },
      {
        sql: 'DELETE FROM schedules WHERE year = ? AND month = ? AND day = ? AND militar_id = ?',
        args: [year, month, dayB, militarBId]
      },
      {
        sql: 'INSERT OR REPLACE INTO schedules (year, month, day, militar_id, shift_code) VALUES (?, ?, ?, ?, ?)',
        args: [year, month, dayB, militarAId, shiftB]
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
