import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { fetchSolcastData } from '../services/solcastService';
import { storeData } from '../database/db';

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    console.info('Lambda function invoked with event:', JSON.stringify(event));

    try {
        if (!process.env.SECRET_ARN) {
            throw new Error("Missing SECRET_ARN environment variable");
        }

        console.info('Fetching secret from Secrets Manager...');
        const secretResponse = await secretsClient.send(new GetSecretValueCommand({
            SecretId: process.env.SECRET_ARN!,
        }));

        const dbPassword = secretResponse.SecretString ? JSON.parse(secretResponse.SecretString).password : '';
        console.info('Secret fetched successfully');

        console.info('Fetching data from Solcast API...');
        const data = await fetchSolcastData();
        console.info('Data fetched from Solcast API:', JSON.stringify(data));

        console.info('Processing data...');
        const processedData = processData(data);
        console.info('Processed data:', JSON.stringify(processedData));

        console.info('Storing data in PostgreSQL...');
        await storeData(processedData, dbPassword);

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
    return {
        ...data,
        pv_power_rooftop: data.pv_power_rooftop * 1000,
    };
};