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
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, 
                },
                {
                    name: 'SoltrackPublicSubnet',
                    subnetType: ec2.SubnetType.PUBLIC, 
                },
            ],
        });

        const rdsSecurityGroup = new ec2.SecurityGroup(this, 'RDSSecurityGroup', {
            vpc,
            description: 'Allow access to RDS from Lambda',
            allowAllOutbound: true,
        });

        
        const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
            vpc,
            description: 'Allow Lambda to access RDS',
            allowAllOutbound: true,
        });

        // Allow Lambda security group to connect to RDS on port 5432
        rdsSecurityGroup.addIngressRule(
            lambdaSecurityGroup,
            ec2.Port.tcp(5432),
            'Allow Lambda to access RDS'
        );

      
        const dbInstance = new rds.DatabaseInstance(this, 'SoltrackRDS', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_13,
            }),
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, 
            },
            databaseName: 'soltrackdb',
            credentials: rds.Credentials.fromGeneratedSecret('soltrackadmin'),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            securityGroups: [rdsSecurityGroup],
        });

        new ec2.InterfaceVpcEndpoint(this, 'SecretsManagerVpcEndpoint', {
            vpc,
            service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
            subnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
        });

    
        new ec2.InterfaceVpcEndpoint(this, 'RDSEndpoint', {
            vpc,
            service: ec2.InterfaceVpcEndpointAwsService.RDS,
            subnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
        });

        
        const initDbLambda = new NodejsFunction(this, 'InitDbLambda', {
            entry: path.join(__dirname, '../../dist/lambda/initDb.js'),
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            environment: {
                DB_HOST: dbInstance.dbInstanceEndpointAddress,
                DB_PORT: dbInstance.dbInstanceEndpointPort,
                DB_NAME: 'soltrackdb',
                SECRET_ARN: dbInstance.secret!.secretArn,
            },
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroups: [lambdaSecurityGroup],
        });

   
        dbInstance.secret?.grantRead(initDbLambda);

        const dataProcessingLambda = new NodejsFunction(this, 'SoltrackLambda', {
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
                DB_PORT: dbInstance.dbInstanceEndpointPort,
                DB_NAME: 'soltrackdb',
                SECRET_ARN: dbInstance.secret!.secretArn,
            },
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroups: [lambdaSecurityGroup],
            tracing: lambda.Tracing.ACTIVE,
        });

    
        dbInstance.secret?.grantRead(dataProcessingLambda);
        dbInstance.grantConnect(dataProcessingLambda);

        const rule = new events.Rule(this, 'SoltrackRule', {
            schedule: events.Schedule.cron({ minute: '0' }),
        });

        rule.addTarget(new targets.LambdaFunction(dataProcessingLambda));

        
        new cdk.CfnOutput(this, 'RDSInstanceEndpoint', {
            value: dbInstance.dbInstanceEndpointAddress,
        });

        new cdk.CfnOutput(this, 'InitDbLambdaName', {
            value: initDbLambda.functionName,
        });

        new cdk.CfnOutput(this, 'DataProcessingLambdaName', {
            value: dataProcessingLambda.functionName,
        });
    }
}