import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

let cachedDbPassword: string = '';

export const fetchSecret = async (secretArn: string): Promise<string> => {
    if (cachedDbPassword) {
        console.info('Using cached secret');
        if (!cachedDbPassword) {
            throw new Error('Cached password is not set');
        }
        return cachedDbPassword;
    }

    const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });
    const secretResponse = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretArn }));
    if (secretResponse.SecretString) {
        cachedDbPassword = JSON.parse(secretResponse.SecretString).password;
        return cachedDbPassword;
    }
    throw new Error('SecretString is empty');
};