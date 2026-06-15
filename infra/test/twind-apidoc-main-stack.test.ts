import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { TwindApidocStack } from '../lib/twind-apidoc-stack';

describe('TwindApidocStack', () => {
  function buildStack() {
    const app = new cdk.App();
    return new TwindApidocStack(app, 'ApiDocStack', {
      certificateArn: 'arn:aws:acm:us-east-1:602259773298:certificate/test-cert-id',
      env: { account: '602259773298', region: 'eu-west-1' },
    });
  }

  test('stack synthesizes without error', () => {
    expect(() => buildStack()).not.toThrow();
  });

  test('contains S3 bucket, CloudFront distribution, IAM role, and CF function', () => {
    const template = Template.fromStack(buildStack());

    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    template.resourceCountIs('AWS::IAM::Role', 1);
    template.resourceCountIs('AWS::CloudFront::Function', 1);
  });

  test('does not create Route53 alias records by default (pre-cutover)', () => {
    const template = Template.fromStack(buildStack());
    template.resourceCountIs('AWS::Route53::RecordSet', 0);
  });

  test('creates Route53 records when enableDnsAlias is true', () => {
    const app = new cdk.App();
    const stack = new TwindApidocStack(app, 'ApiDocStack', {
      certificateArn: 'arn:aws:acm:us-east-1:602259773298:certificate/test-cert-id',
      env: { account: '602259773298', region: 'eu-west-1' },
      enableDnsAlias: true,
    });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::Route53::RecordSet', 2);
  });

  test('outputs DistributionId, DistributionDomain, and BucketName', () => {
    const template = Template.fromStack(buildStack());
    template.hasOutput('DistributionId', {});
    template.hasOutput('DistributionDomain', {});
    template.hasOutput('BucketName', {});
  });
});
