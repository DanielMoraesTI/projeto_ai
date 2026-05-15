import pool from "../config/mysql.js";

function mapMeetingSummaryRow(row) {
  return {
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    original_text: row.original_text,
    summary: row.summary,
    created_at: row.created_at,
  };
}

async function saveMeetingSummary(projectId, title, originalText, summary) {
  const sql = `
    INSERT INTO meeting_summaries (project_id, title, original_text, summary)
    VALUES (?, ?, ?, ?)
  `;

  const [result] = await pool.execute(sql, [
    projectId,
    title,
    originalText,
    summary,
  ]);

  const [rows] = await pool.execute(
    `
      SELECT
        id,
        project_id,
        title,
        original_text,
        summary,
        created_at
      FROM meeting_summaries
      WHERE id = ?
    `,
    [result.insertId],
  );

  return mapMeetingSummaryRow(rows[0]);
}

async function listMeetingSummaries({ limit = 20, search = "" } = {}) {
  const parsedLimit = Number(limit);
  const safeLimit =
    Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 20;
  const searchText = String(search || "").trim();

  if (!searchText) {
    const [rows] = await pool.query(
      `
        SELECT
          id,
          project_id,
          title,
          original_text,
          summary,
          created_at
        FROM meeting_summaries
        ORDER BY id DESC
        LIMIT ${safeLimit}
      `,
    );

    return rows.map(mapMeetingSummaryRow);
  }

  const likeSearch = `%${searchText}%`;

  const [rows] = await pool.execute(
    `
      SELECT
        id,
        project_id,
        title,
        original_text,
        summary,
        created_at
      FROM meeting_summaries
      WHERE title LIKE ? OR original_text LIKE ? OR summary LIKE ?
      ORDER BY id DESC
      LIMIT ${safeLimit}
    `,
    [likeSearch, likeSearch, likeSearch],
  );

  return rows.map(mapMeetingSummaryRow);
}

async function getMeetingSummaryById(id) {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        project_id,
        title,
        original_text,
        summary,
        created_at
      FROM meeting_summaries
      WHERE id = ?
    `,
    [id],
  );

  if (rows.length === 0) {
    return null;
  }

  return mapMeetingSummaryRow(rows[0]);
}

async function deleteMeetingSummary(id) {
  const [result] = await pool.execute(
    `DELETE FROM meeting_summaries WHERE id = ?`,
    [id],
  );

  return result.affectedRows > 0;
}

const meetingSummaryService = {
  saveMeetingSummary,
  listMeetingSummaries,
  getMeetingSummaryById,
  deleteMeetingSummary,
};

export default meetingSummaryService;
