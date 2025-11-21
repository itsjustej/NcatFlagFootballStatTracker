// teams table

import pool from "../db.js";

export const TeamModel = {
  async getAll() {
    const [rows] = await pool.query("SELECT * FROM Teams");
    return rows;
  }
};
