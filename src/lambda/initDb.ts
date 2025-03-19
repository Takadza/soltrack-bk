import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Client } from 'pg';

export const handler = async () => {
    console.info('Initializing database schema...');

    const secretsManager = new SecretsManagerClient({});
    const secretArn = process.env.SECRET_ARN!;
    const secretResponse = await secretsManager.send(
        new GetSecretValueCommand({ SecretId: secretArn })
    );
    const secret = JSON.parse(secretResponse.SecretString || '{}');

    const client = new Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME,
        user: secret.username,
        password: secret.password,
    });

    try {
        await client.connect();
        console.info('Connected to PostgreSQL database');

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS solcast_data (
                id SERIAL PRIMARY KEY,
                air_temp FLOAT,
                dni FLOAT,
                ghi FLOAT,
                relative_humidity FLOAT,
                surface_pressure FLOAT,
                wind_speed_10m FLOAT,
                pv_power_rooftop FLOAT
            );
        `;
        await client.query(createTableQuery);
        console.info('Table "solcast_data" created successfully');
    } catch (error) {
        console.error('Error initializing database schema:', error);
        throw error;
    } finally {
        await client.end();
    }
};