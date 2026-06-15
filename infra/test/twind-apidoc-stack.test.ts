import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ApidocBucket } from '../lib/constructs/apidoc-bucket';
import { ApidocDistribution } from '../lib/constructs/apidoc-distribution';
import { ApidocDns } from '../lib/constructs/apidoc-dns';
import { GithubOidcRole } from '../lib/constructs/github-oidc-role';

describe('ApidocBucket', () => {
  test('creates private S3 bucket with encryption', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');

    new ApidocBucket(stack, 'Bucket');

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'twind-apidoc-assets-bucket-prod',
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      },
      OwnershipControls: {
        Rules: [{ ObjectOwnership: 'BucketOwnerEnforced' }],
      },
    });

    // The OAC bucket policy is attached at the distribution, not on a
    // standalone bucket — so no bucket policy is expected here.
    template.resourceCountIs('AWS::S3::BucketPolicy', 0);
  });
});

describe('ApidocDistribution', () => {
  function buildStack() {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack', {
      env: { account: '602259773298', region: 'eu-west-1' },
    });
    const { bucket } = new ApidocBucket(stack, 'Bucket');
    new ApidocDistribution(stack, 'Dist', {
      bucket,
      certificateArn: 'arn:aws:acm:us-east-1:602259773298:certificate/test-cert-id',
    });
    return stack;
  }

  test('grants CloudFront read access via an OAC bucket policy', () => {
    const template = Template.fromStack(buildStack());
    template.hasResourceProperties('AWS::CloudFront::OriginAccessControl', {
      OriginAccessControlConfig: Match.objectLike({
        OriginAccessControlOriginType: 's3',
        SigningBehavior: 'always',
      }),
    });
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:GetObject',
            Effect: 'Allow',
            Principal: { Service: 'cloudfront.amazonaws.com' },
          }),
        ]),
      },
    });
  });

  test('creates CloudFront distribution with defaultRootObject index.html', () => {
    const template = Template.fromStack(buildStack());
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        DefaultRootObject: 'index.html',
      },
    });
  });

  test('creates CloudFront Function for directory index rewrite', () => {
    const template = Template.fromStack(buildStack());
    template.hasResourceProperties('AWS::CloudFront::Function', {
      FunctionConfig: {
        Runtime: 'cloudfront-js-2.0',
      },
    });
  });

  test('distribution aliases include api-doc.twind.io', () => {
    const template = Template.fromStack(buildStack());
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        Aliases: ['api-doc.twind.io'],
      },
    });
  });
});

describe('ApidocDns', () => {
  test('creates A and AAAA alias records for api-doc.twind.io', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack', {
      env: { account: '602259773298', region: 'eu-west-1' },
    });
    const { bucket } = new ApidocBucket(stack, 'Bucket');
    const { distribution } = new ApidocDistribution(stack, 'Dist', {
      bucket,
      certificateArn: 'arn:aws:acm:us-east-1:602259773298:certificate/test-cert-id',
    });

    new ApidocDns(stack, 'Dns', { distribution });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Route53::RecordSet', {
      Name: 'api-doc.twind.io.',
      Type: 'A',
      HostedZoneId: 'Z09139373LEQZJW35V2WI',
    });

    template.hasResourceProperties('AWS::Route53::RecordSet', {
      Name: 'api-doc.twind.io.',
      Type: 'AAAA',
      HostedZoneId: 'Z09139373LEQZJW35V2WI',
    });
  });
});

describe('GithubOidcRole', () => {
  function buildOidcStack() {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack', {
      env: { account: '602259773298', region: 'eu-west-1' },
    });
    const { bucket } = new ApidocBucket(stack, 'Bucket');
    const { distribution } = new ApidocDistribution(stack, 'Dist', {
      bucket,
      certificateArn: 'arn:aws:acm:us-east-1:602259773298:certificate/test-cert-id',
    });
    new GithubOidcRole(stack, 'OidcRole', { bucket, distribution });
    return stack;
  }

  test('creates IAM role with GitHub OIDC trust scoped to repo', () => {
    const template = Template.fromStack(buildOidcStack());

    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRoleWithWebIdentity',
            Condition: {
              StringLike: {
                'token.actions.githubusercontent.com:sub':
                  'repo:twind-ops/TwindApi-PublicOpenApi:*',
              },
            },
            Effect: 'Allow',
          },
        ],
      },
    });
  });

  test('role has s3 put/delete/list and cloudfront invalidation permissions', () => {
    const template = Template.fromStack(buildOidcStack());

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['s3:PutObject', 's3:DeleteObject']),
            Effect: 'Allow',
          }),
          Match.objectLike({
            Action: 's3:ListBucket',
            Effect: 'Allow',
          }),
          Match.objectLike({
            Action: 'cloudfront:CreateInvalidation',
            Effect: 'Allow',
          }),
        ]),
      },
    });
  });
});

