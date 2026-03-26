async function getRecentRiskEvents(ctx, req, res, next) {
  try {
    const { pool } = ctx;
    const r = await pool.query(
      `select id, user_id, ip_address, location, risk_score, created_at
         from login_events
        order by created_at desc
        limit 50`
    );
    res.json({ items: r.rows });
  } catch (e) {
    next(e);
  }
}

module.exports = { getRecentRiskEvents };

