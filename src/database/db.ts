import { Pool } from 'pg';

export const storeData = async (
    data: any[],
    dbCredentials: { username: string; password: string; host: string; port: number; dbname: string }
) => {
    const pool = new Pool({
        host: dbCredentials.host,
        port: dbCredentials.port,
        database: dbCredentials.dbname,
        user: dbCredentials.username,
        password: dbCredentials.password,
        max: 10,
        idleTimeoutMillis: 30000,
    });

    const client = await pool.connect();
    try {
        console.info('Connected to PostgreSQL database');

        const query = `
            INSERT INTO solcast_data (air_temp, dni, ghi, relative_humidity, surface_pressure, wind_speed_10m, pv_power_rooftop)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        for (const row of data) {
            const values = [
                row.air_temp,
                row.dni,
                row.ghi,
                row.relative_humidity,
                row.surface_pressure,
                row.wind_speed_10m,
                row.pv_power_rooftop,
            ];
            console.info('Executing query with values:', values);
            await client.query(query, values);
        }

        console.info('Data stored successfully');
    } catch (error) {
        console.error('Error storing data in PostgreSQL:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
};