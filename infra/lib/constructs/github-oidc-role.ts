import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

interface GithubOidcRoleProps {
  bucket: s3.Bucket;
  distribution: cloudfront.Distribution;
}

const GITHUB_OIDC_AUDIENCE = 'sts.amazonaws.com';
const REPO = 'twind-ops/TwindApi-PublicOpenApi';

export class GithubOidcRole extends Construct {
  readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: GithubOidcRoleProps) {
    super(scope, id);

    const oidcProvider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      'GithubOidcProvider',
      `arn:aws:iam::${cdk.Stack.of(this).account}:oidc-provider/token.actions.githubusercontent.com`,
    );

    this.role = new iam.Role(this, 'DeployRole', {
      roleName: 'twind-apidoc-github-deploy-role',
      assumedBy: new iam.WebIdentityPrincipal(oidcProvider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': GITHUB_OIDC_AUDIENCE,
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:${REPO}:*`,
        },
      }),
    });

    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutObject', 's3:DeleteObject'],
        resources: [`${props.bucket.bucketArn}/*`],
      }),
    );

    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:ListBucket'],
        resources: [props.bucket.bucketArn],
      }),
    );

    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['cloudfront:CreateInvalidation'],
        resources: [
          `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/${props.distribution.distributionId}`,
        ],
      }),
    );
  }
}
