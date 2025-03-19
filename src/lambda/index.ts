import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { fetchSolcastData } from '../services/solcastService';
import { storeData } from '../database/db';
import { fetchSecret } from '../utils/secrets';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    console.info('Lambda function invoked with event:', JSON.stringify(event));

    try {
        if (!process.env.SECRET_ARN) {
            throw new Error('Missing SECRET_ARN environment variable');
        }

        console.info('Fetching secret from Secrets Manager...');
        const dbCredentials = await fetchSecret(process.env.SECRET_ARN!); // Fetch all required fields
        console.info('Secret fetched successfully:', JSON.stringify(dbCredentials));

        console.info('Fetching data from Solcast API...');
        const data = await fetchSolcastData();
        console.info('Raw data from Solcast API:', JSON.stringify(data));

        console.info('Processing data...');
        const processedData = processData(data);
        console.info('Processed data:', JSON.stringify(processedData));

        console.info('Storing data in PostgreSQL...');
        await storeData(processedData, dbCredentials); // Pass credentials object

        console.info('Data processed and stored successfully');
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Data processed and stored successfully' }),
        };
    } catch (error) {
        console.error('Error processing and storing data:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};

const processData = (data: any) => {
    console.info('Processing data:', JSON.stringify(data));

    if (!data || !Array.isArray(data.data)) {
        throw new Error('Invalid data format');
    }

    return data.data.map((entry: any) => ({
        air_temp: entry.air_temp || 0,
        dni: entry.dni || 0,
        ghi: entry.ghi || 0,
        relative_humidity: entry.relative_humidity || 0,
        surface_pressure: entry.surface_pressure || 0,
        wind_speed_10m: entry.wind_speed_10m || 0,
        pv_power_rooftop: (entry.pv_power_rooftop || 0) * 1000, // Convert to watts
    }));
};