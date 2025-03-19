import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export const fetchSecret = async (secretArn: string): Promise<{
    username: string;
    password: string;
    host: string;
    port: number;
    dbname: string;
}> => {
    const secretsManager = new SecretsManagerClient({});
    try {
        const secretResponse = await secretsManager.send(
            new GetSecretValueCommand({ SecretId: secretArn })
        );
        if (!secretResponse.SecretString) {
            throw new Error('SecretString is empty');
        }
        const secret = JSON.parse(secretResponse.SecretString);
        if (!secret.username || !secret.password || !secret.host || !secret.port || !secret.dbname) {
            throw new Error('Secret is missing required fields: username, password, host, port, or dbname');
        }
        return {
            username: secret.username,
            password: secret.password,
            host: secret.host,
            port: parseInt(secret.port, 10),
            dbname: secret.dbname,
        };
    } catch (error) {
        console.error('Error fetching secret from Secrets Manager:', error);
        throw error;
    }
};