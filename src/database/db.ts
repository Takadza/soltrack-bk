import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
});

export const storeData = async (data: any, password: string) => {
  const client = await pool.connect();
  try {
    console.info('Connected to PostgreSQL database');

    const query = `
      INSERT INTO solcast_data (air_temp, dni, ghi, relative_humidity, surface_pressure, wind_speed_10m, pv_power_rooftop)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    const values = [
      data.air_temp,
      data.dni,
      data.ghi,
      data.relative_humidity,
      data.surface_pressure,
      data.wind_speed_10m,
      data.pv_power_rooftop,
    ];

    console.info('Executing query:', query, 'with values:', values);
    await client.query(query, values);
    console.info('Data stored successfully');
  } catch (error) {
    console.error('Error storing data in PostgreSQL:', error);
    throw error;
  } finally {
    client.release();
  }
};