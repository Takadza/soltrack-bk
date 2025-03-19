import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class SoltrackStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const vpc = new ec2.Vpc(this, 'SoltrackVPC', {
            maxAzs: 2,
            subnetConfiguration: [
                {
                    name: 'SoltrackPrivateSubnet',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
                {
                    name: 'SoltrackPublicSubnet',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
            ],
        });

        const dbInstance = new rds.DatabaseInstance(this, 'SoltrackRDS', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_13,
            }),
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            },
            databaseName: 'soltrackdb',
            credentials: rds.Credentials.fromGeneratedSecret('soltrackadmin'),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const lambdaFunction = new NodejsFunction(this, 'SoltrackLambda', {
            entry: path.join(__dirname, '../../dist/lambda/index.js'),
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: cdk.Duration.seconds(60), 
            memorySize: 256,
            bundling: {
                forceDockerBundling: false,
                minify: true,
                sourceMap: false,
                externalModules: ['aws-sdk'],
            },
            environment: {
                DB_HOST: dbInstance.dbInstanceEndpointAddress,
                DB_NAME: 'soltrackdb',
                DB_USER: 'soltrackadmin',
                DB_PORT: dbInstance.dbInstanceEndpointPort,
                SECRET_ARN: dbInstance.secret!.secretArn,
            },
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            },
            tracing: lambda.Tracing.ACTIVE,
        });

        dbInstance.secret?.grantRead(lambdaFunction);
        dbInstance.grantConnect(lambdaFunction);

        const rule = new events.Rule(this, 'SoltrackRule', {
            schedule: events.Schedule.cron({ minute: '0' }),
        });

        rule.addTarget(new targets.LambdaFunction(lambdaFunction));

        new cdk.CfnOutput(this, 'RDSInstanceEndpoint', {
            value: dbInstance.dbInstanceEndpointAddress,
        });

        new cdk.CfnOutput(this, 'LambdaFunctionName', {
            value: lambdaFunction.functionName,
        });
    }
}