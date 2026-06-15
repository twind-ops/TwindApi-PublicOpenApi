import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';
import { ApidocBucket } from './constructs/apidoc-bucket';
import { ApidocDistribution } from './constructs/apidoc-distribution';
import { ApidocDns } from './constructs/apidoc-dns';
import { GithubOidcRole } from './constructs/github-oidc-role';

interface TwindApidocStackProps extends cdk.StackProps {
  certificateArn: string;
  /**
   * Set to true only during DNS cutover — creates Route53 alias records.
   * Keep false until the CloudFront distribution is verified via raw CF domain.
   */
  enableDnsAlias?: boolean;
}

export class TwindApidocStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TwindApidocStackProps) {
    super(scope, id, { ...props, crossRegionReferences: true });

    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: 'twind-apidoc CloudFront OAI',
    });

    const apidocBucket = new ApidocBucket(this, 'Bucket', { oai });
    const apidocDist = new ApidocDistribution(this, 'Distribution', {
      bucket: apidocBucket.bucket,
      oai,
      certificateArn: props.certificateArn,
    });

    new GithubOidcRole(this, 'OidcRole', {
      bucket: apidocBucket.bucket,
      distribution: apidocDist.distribution,
    });

    if (props.enableDnsAlias) {
      new ApidocDns(this, 'Dns', { distribution: apidocDist.distribution });
    }

    new cdk.CfnOutput(this, 'DistributionId', {
      value: apidocDist.distribution.distributionId,
      description: 'CloudFront distribution ID (used in publish workflow)',
    });

    new cdk.CfnOutput(this, 'DistributionDomain', {
      value: apidocDist.distribution.distributionDomainName,
      description: 'CloudFront domain for smoke-testing before DNS cutover',
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: apidocBucket.bucket.bucketName,
    });
  }
}
