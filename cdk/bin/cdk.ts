#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {  SoltrackStack } from '../lib/cdk-stack';

const app = new cdk.App();
new SoltrackStack(app, 'SoltrackStack', {
    env: {
         account: '195275664259',
         region: 'eu-north-1'
    },
});