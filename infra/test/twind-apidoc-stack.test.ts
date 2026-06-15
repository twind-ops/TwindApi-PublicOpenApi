import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ApidocBucket } from '../lib/constructs/apidoc-bucket';
import { ApidocDistribution } from '../lib/constructs/apidoc-distribution';
import { ApidocDns } from '../lib/constructs/apidoc-dns';
import { GithubOidcRole } from '../lib/constructs/github-oidc-role';

describe('ApidocBucket', () => {
  test('creates private S3 bucket with OAI and encryption', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const oai = new cdk.aws_cloudfront.OriginAccessIdentity(stack, 'OAI');

    new ApidocBucket(stack, 'Bucket', { oai });

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

    // Bucket policy grants OAI read access
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['s3:GetObject*']),
            Effect: 'Allow',
          }),
        ]),
      },
    });
  });
});

describe('ApidocDistribution', () => {
  function buildStack() {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack', {
      env: { account: '602259773298', region: 'eu-west-1' },
    });
    const oai = new cdk.aws_cloudfront.OriginAccessIdentity(stack, 'OAI');
    const { bucket } = new ApidocBucket(stack, 'Bucket', { oai });
    new ApidocDistribution(stack, 'Dist', {
      bucket,
      oai,
      certificateArn: 'arn:aws:acm:us-east-1:602259773298:certificate/test-cert-id',
    });
    return stack;
  }

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
    const oai = new cdk.aws_cloudfront.OriginAccessIdentity(stack, 'OAI');
    const { bucket } = new ApidocBucket(stack, 'Bucket', { oai });
    const { distribution } = new ApidocDistribution(stack, 'Dist', {
      bucket,
      oai,
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

