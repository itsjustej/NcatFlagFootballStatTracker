import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Beastmode24!",
  database: "StatTracker"
});

export default db;
