#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { TwindApidocCertStack } from '../lib/twind-apidoc-cert-stack';
import { TwindApidocStack } from '../lib/twind-apidoc-stack';

const app = new cdk.App();

const certStack = new TwindApidocCertStack(app, 'TwindApidocCertStack', {
  env: { account: '602259773298', region: 'us-east-1' },
  crossRegionReferences: true,
});

new TwindApidocStack(app, 'TwindApidocStack', {
  env: { account: '602259773298', region: 'eu-west-1' },
  certificateArn: certStack.certificateArn,
  // Set enableDnsAlias: true only at DNS cutover step
  enableDnsAlias: false,
});
