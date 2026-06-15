import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ApidocBucket } from '../lib/constructs/apidoc-bucket';

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
