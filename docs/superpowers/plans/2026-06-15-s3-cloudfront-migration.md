# S3 + CloudFront Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `api-doc.twind.io` from GitHub Pages to a dedicated S3 + CloudFront distribution with a GitHub Release-triggered publish workflow.

**Architecture:** A CDK TypeScript project in `infra/` provisions an S3 bucket (private, OAI), a CloudFront distribution with a viewer-request directory-index function, an ACM cert (us-east-1) in a separate cross-region stack, and a GitHub OIDC IAM role scoped to sync + invalidate. A GitHub Actions workflow triggers on `release: published`, syncs the site files (excluding dev artifacts), and invalidates the distribution. The Route 53 alias record is included in the CDK but deployed only at cutover.

**Tech Stack:** AWS CDK v2 (TypeScript), aws-cdk-lib, Node.js 20, GitHub Actions (OIDC, aws-actions/configure-aws-credentials@v4)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `infra/package.json` | Create | Node deps: aws-cdk-lib, constructs, aws-cdk, jest, ts-jest, @types/node |
| `infra/tsconfig.json` | Create | TypeScript config for CDK project |
| `infra/cdk.json` | Create | CDK app entry, feature flags |
| `infra/jest.config.js` | Create | Jest + ts-jest config |
| `infra/bin/app.ts` | Create | Instantiates cert stack (us-east-1) + main stack (eu-west-1) |
| `infra/lib/twind-apidoc-stack.ts` | Create | Main stack: bucket, distribution, OIDC role |
| `infra/lib/twind-apidoc-cert-stack.ts` | Create | ACM cert stack (us-east-1, cross-region) |
| `infra/lib/constructs/apidoc-bucket.ts` | Create | S3 private bucket with OAI grant |
| `infra/lib/constructs/apidoc-distribution.ts` | Create | CloudFront dist + CF Function + OAI |
| `infra/lib/constructs/apidoc-dns.ts` | Create | Route 53 A+AAAA alias records (cutover-only) |
| `infra/lib/constructs/github-oidc-role.ts` | Create | IAM role with GitHub OIDC trust + scoped perms |
| `infra/test/twind-apidoc-stack.test.ts` | Create | CDK assertion tests for main stack |
| `infra/test/twind-apidoc-cert-stack.test.ts` | Create | CDK assertion tests for cert stack |
| `.github/workflows/publish.yml` | Create | Release-triggered sync + invalidation workflow |

---

## Task 1: Initialize `infra/` CDK project

**Files:**
- Create: `infra/package.json`
- Create: `infra/tsconfig.json`
- Create: `infra/cdk.json`
- Create: `infra/jest.config.js`

- [ ] **Step 1: Create `infra/package.json`**

```json
{
  "name": "twind-apidoc-infra",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "test": "jest",
    "cdk": "cdk"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "20.x",
    "aws-cdk": "2.1009.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "ts-node": "^10.9.2",
    "typescript": "~5.5.4"
  },
  "dependencies": {
    "aws-cdk-lib": "2.1009.0",
    "constructs": "^10.0.0"
  }
}
```

- [ ] **Step 2: Create `infra/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["es2020"],
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "strictPropertyInitialization": false,
    "experimentalDecorators": true,
    "outDir": "dist"
  },
  "include": ["bin", "lib", "test"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `infra/cdk.json`**

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/app.ts",
  "watch": {
    "include": ["**"],
    "exclude": [
      "README.md",
      "cdk*.json",
      "**/*.d.ts",
      "**/*.js",
      "tsconfig.json",
      "package*.json",
      "yarn.lock",
      "node_modules",
      "test"
    ]
  },
  "context": {
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
    "@aws-cdk/core:checkSecretUsage": true,
    "@aws-cdk/core:target-partitions": ["aws"],
    "@aws-cdk-containers/ecs-service-extensions:enableDefaultLogDriver": true,
    "@aws-cdk/aws-ec2:uniqueImdsv2TemplateName": true,
    "@aws-cdk/aws-ecs:arnFormatIncludesClusterName": true,
    "@aws-cdk/aws-iam:minimizePolicies": true,
    "@aws-cdk/core:validateSnapshotRemovalPolicy": true,
    "@aws-cdk/aws-codepipeline:crossAccountKeyAliasStackSafeResourceName": true,
    "@aws-cdk/aws-s3:createDefaultLoggingPolicy": true,
    "@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption": true,
    "@aws-cdk/aws-apigateway:disableCloudWatchRole": true,
    "@aws-cdk/core:enablePartitionLiterals": true,
    "@aws-cdk/aws-events:eventsTargetQueueSameAccount": true,
    "@aws-cdk/aws-iam:standardizedServicePrincipals": true,
    "@aws-cdk/aws-ecs:disableExplicitDeploymentControllerForCircuitBreaker": true,
    "@aws-cdk/aws-iam:importedRoleStackSafeDefaultPolicyName": true,
    "@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy": true,
    "@aws-cdk/aws-route53-patters:useCertificate": true,
    "@aws-cdk/customresources:installLatestAwsSdkDefault": false,
    "@aws-cdk/aws-rds:databaseProxyUniqueResourceName": true,
    "@aws-cdk/aws-codedeploy:removeAlarmsFromDeploymentGroup": true,
    "@aws-cdk/aws-apigateway:authorizerChangeDestroyWithToo": true,
    "@aws-cdk/aws-apigateway:requestValidatorUniqueId": true,
    "@aws-cdk/aws-cloudfront:defaultSecurityPolicyTLSv1.2_2021": true
  }
}
```

- [ ] **Step 4: Create `infra/jest.config.js`**

```js
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
```

- [ ] **Step 5: Install dependencies**

```bash
cd infra && npm install
```

Expected: `node_modules/` populated, no errors.

- [ ] **Step 6: Commit**

```bash
git add infra/package.json infra/tsconfig.json infra/cdk.json infra/jest.config.js infra/package-lock.json
git commit -m "chore: initialize CDK infra project skeleton"
```

---

## Task 2: S3 bucket construct

**Files:**
- Create: `infra/lib/constructs/apidoc-bucket.ts`
- Create: `infra/test/twind-apidoc-stack.test.ts` (partial — will be extended in later tasks)

- [ ] **Step 1: Write the failing test for the bucket construct**

Create `infra/test/twind-apidoc-stack.test.ts`:

```typescript
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
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
        Statement: [
          {
            Action: 's3:GetObject',
            Effect: 'Allow',
          },
        ],
      },
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd infra && npm test -- --testPathPattern="twind-apidoc-stack"
```

Expected: FAIL — `ApidocBucket` not found.

- [ ] **Step 3: Create `infra/lib/constructs/apidoc-bucket.ts`**

```typescript
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

interface ApidocBucketProps {
  oai: cloudfront.OriginAccessIdentity;
}

export class ApidocBucket extends Construct {
  readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: ApidocBucketProps) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: 'twind-apidoc-assets-bucket-prod',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.bucket.grantRead(props.oai);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd infra && npm test -- --testPathPattern="twind-apidoc-stack"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add infra/lib/constructs/apidoc-bucket.ts infra/test/twind-apidoc-stack.test.ts
git commit -m "feat(infra): add ApidocBucket construct"
```

---

## Task 3: ACM certificate stack

**Files:**
- Create: `infra/lib/twind-apidoc-cert-stack.ts`
- Create: `infra/test/twind-apidoc-cert-stack.test.ts`

- [ ] **Step 1: Write failing test**

Create `infra/test/twind-apidoc-cert-stack.test.ts`:

```typescript
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { TwindApidocCertStack } from '../lib/twind-apidoc-cert-stack';

describe('TwindApidocCertStack', () => {
  test('creates ACM certificate in us-east-1 with DNS validation', () => {
    const app = new cdk.App();
    const stack = new TwindApidocCertStack(app, 'CertStack', {
      env: { account: '602259773298', region: 'us-east-1' },
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: 'api-doc.twind.io',
      ValidationMethod: 'DNS',
      DomainValidationOptions: [
        {
          DomainName: 'api-doc.twind.io',
          HostedZoneId: 'Z09139373LEQZJW35V2WI',
        },
      ],
    });
  });

  test('stack is in us-east-1', () => {
    const app = new cdk.App();
    const stack = new TwindApidocCertStack(app, 'CertStack', {
      env: { account: '602259773298', region: 'us-east-1' },
    });

    expect(stack.region).toBe('us-east-1');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd infra && npm test -- --testPathPattern="cert-stack"
```

Expected: FAIL — `TwindApidocCertStack` not found.

- [ ] **Step 3: Create `infra/lib/twind-apidoc-cert-stack.ts`**

```typescript
import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

const HOSTED_ZONE_ID = 'Z09139373LEQZJW35V2WI';
const DOMAIN_NAME = 'api-doc.twind.io';

export class TwindApidocCertStack extends cdk.Stack {
  readonly certificateArn: string;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, { ...props, crossRegionReferences: true });

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
      hostedZoneId: HOSTED_ZONE_ID,
      zoneName: 'twind.io',
    });

    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: DOMAIN_NAME,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    this.certificateArn = certificate.certificateArn;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd infra && npm test -- --testPathPattern="cert-stack"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add infra/lib/twind-apidoc-cert-stack.ts infra/test/twind-apidoc-cert-stack.test.ts
git commit -m "feat(infra): add TwindApidocCertStack (us-east-1 ACM)"
```

---

## Task 4: CloudFront distribution construct

**Files:**
- Create: `infra/lib/constructs/apidoc-distribution.ts`

- [ ] **Step 1: Write failing test** — add to `infra/test/twind-apidoc-stack.test.ts`:

Open the file and append a new `describe` block:

```typescript
import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ApidocBucket } from '../lib/constructs/apidoc-bucket';
import { ApidocDistribution } from '../lib/constructs/apidoc-distribution';

// (keep existing describe block above, add this one below)

describe('ApidocDistribution', () => {
  function buildStack(includeDns = false) {
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

  test('creates CloudFront distribution with OAI S3 origin', () => {
    const template = Template.fromStack(buildStack());
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        DefaultRootObject: 'index.html',
        HttpVersion: 'http2',
        IPV6Enabled: true,
        ViewerCertificate: {
          MinimumProtocolVersion: 'TLSv1.2_2021',
          SslSupportMethod: 'sni-only',
        },
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
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd infra && npm test -- --testPathPattern="twind-apidoc-stack"
```

Expected: FAIL — `ApidocDistribution` not found.

- [ ] **Step 3: Create `infra/lib/constructs/apidoc-distribution.ts`**

```typescript
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

interface ApidocDistributionProps {
  bucket: s3.Bucket;
  oai: cloudfront.OriginAccessIdentity;
  certificateArn: string;
}

const DIRECTORY_INDEX_FUNCTION_CODE = `
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!uri.includes('.')) {
    request.uri += '/index.html';
  }
  return request;
}
`.trim();

export class ApidocDistribution extends Construct {
  readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: ApidocDistributionProps) {
    super(scope, id);

    const directoryIndexFn = new cloudfront.Function(this, 'DirectoryIndexFn', {
      functionName: 'twind-apidoc-directory-index',
      code: cloudfront.FunctionCode.fromInline(DIRECTORY_INDEX_FUNCTION_CODE),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });

    const certificate = acm.Certificate.fromCertificateArn(
      this,
      'Certificate',
      props.certificateArn,
    );

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(props.bucket, {
          originAccessIdentity: props.oai,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        compress: true,
        functionAssociations: [
          {
            function: directoryIndexFn,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      defaultRootObject: 'index.html',
      domainNames: ['api-doc.twind.io'],
      certificate,
      httpVersion: cloudfront.HttpVersion.HTTP2,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd infra && npm test -- --testPathPattern="twind-apidoc-stack"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add infra/lib/constructs/apidoc-distribution.ts infra/test/twind-apidoc-stack.test.ts
git commit -m "feat(infra): add ApidocDistribution construct with CF Function"
```

---

## Task 5: Route 53 DNS construct (cutover-only)

**Files:**
- Create: `infra/lib/constructs/apidoc-dns.ts`

- [ ] **Step 1: Write failing test** — add to `infra/test/twind-apidoc-stack.test.ts`:

```typescript
import { ApidocDns } from '../lib/constructs/apidoc-dns';

// Add this describe block at the bottom of twind-apidoc-stack.test.ts

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

    // A record
    template.hasResourceProperties('AWS::Route53::RecordSet', {
      Name: 'api-doc.twind.io.',
      Type: 'A',
      HostedZoneId: 'Z09139373LEQZJW35V2WI',
    });

    // AAAA record
    template.hasResourceProperties('AWS::Route53::RecordSet', {
      Name: 'api-doc.twind.io.',
      Type: 'AAAA',
      HostedZoneId: 'Z09139373LEQZJW35V2WI',
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd infra && npm test -- --testPathPattern="twind-apidoc-stack"
```

Expected: FAIL — `ApidocDns` not found.

- [ ] **Step 3: Create `infra/lib/constructs/apidoc-dns.ts`**

```typescript
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

interface ApidocDnsProps {
  distribution: cloudfront.Distribution;
}

const HOSTED_ZONE_ID = 'Z09139373LEQZJW35V2WI';
const DOMAIN_NAME = 'api-doc.twind.io';

export class ApidocDns extends Construct {
  constructor(scope: Construct, id: string, props: ApidocDnsProps) {
    super(scope, id);

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
      hostedZoneId: HOSTED_ZONE_ID,
      zoneName: 'twind.io',
    });

    const target = route53.RecordTarget.fromAlias(
      new route53Targets.CloudFrontTarget(props.distribution),
    );

    new route53.ARecord(this, 'ARecord', {
      zone: hostedZone,
      recordName: DOMAIN_NAME,
      target,
    });

    new route53.AaaaRecord(this, 'AaaaRecord', {
      zone: hostedZone,
      recordName: DOMAIN_NAME,
      target,
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd infra && npm test -- --testPathPattern="twind-apidoc-stack"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add infra/lib/constructs/apidoc-dns.ts infra/test/twind-apidoc-stack.test.ts
git commit -m "feat(infra): add ApidocDns construct (cutover-only alias records)"
```

---

## Task 6: GitHub OIDC deploy role construct

**Files:**
- Create: `infra/lib/constructs/github-oidc-role.ts`

- [ ] **Step 1: Write failing test** — add to `infra/test/twind-apidoc-stack.test.ts`:

```typescript
import { GithubOidcRole } from '../lib/constructs/github-oidc-role';

// Add this describe block at the bottom of twind-apidoc-stack.test.ts

describe('GithubOidcRole', () => {
  test('creates IAM role with GitHub OIDC trust scoped to repo', () => {
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

    new GithubOidcRole(stack, 'OidcRole', { bucket, distribution });

    const template = Template.fromStack(stack);

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

    new GithubOidcRole(stack, 'OidcRole', { bucket, distribution });

    const template = Template.fromStack(stack);

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
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd infra && npm test -- --testPathPattern="twind-apidoc-stack"
```

Expected: FAIL — `GithubOidcRole` not found.

- [ ] **Step 3: Create `infra/lib/constructs/github-oidc-role.ts`**

```typescript
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

interface GithubOidcRoleProps {
  bucket: s3.Bucket;
  distribution: cloudfront.Distribution;
}

const GITHUB_OIDC_PROVIDER_URL = 'https://token.actions.githubusercontent.com';
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

    // S3 object-level permissions
    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutObject', 's3:DeleteObject'],
        resources: [`${props.bucket.bucketArn}/*`],
      }),
    );

    // S3 list permission (needed by aws s3 sync)
    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:ListBucket'],
        resources: [props.bucket.bucketArn],
      }),
    );

    // CloudFront invalidation permission
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd infra && npm test -- --testPathPattern="twind-apidoc-stack"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add infra/lib/constructs/github-oidc-role.ts infra/test/twind-apidoc-stack.test.ts
git commit -m "feat(infra): add GithubOidcRole construct with scoped S3+CF permissions"
```

---

## Task 7: Main stack and CDK app entry point

**Files:**
- Create: `infra/lib/twind-apidoc-stack.ts`
- Create: `infra/bin/app.ts`

- [ ] **Step 1: Write failing test for main stack** — create `infra/test/twind-apidoc-main-stack.test.ts`:

```typescript
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

  test('does not create Route53 alias records (pre-cutover)', () => {
    const template = Template.fromStack(buildStack());
    template.resourceCountIs('AWS::Route53::RecordSet', 0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd infra && npm test -- --testPathPattern="twind-apidoc-main-stack"
```

Expected: FAIL — `TwindApidocStack` not found.

- [ ] **Step 3: Create `infra/lib/twind-apidoc-stack.ts`**

```typescript
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';
import { ApidocBucket } from './constructs/apidoc-bucket';
import { ApidocDistribution } from './constructs/apidoc-distribution';
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
      // Imported here to keep it out of the default bundle path
      const { ApidocDns } = require('./constructs/apidoc-dns');
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
```

- [ ] **Step 4: Create `infra/bin/app.ts`**

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TwindApidocCertStack } from '../lib/twind-apidoc-cert-stack';
import { TwindApidocStack } from '../lib/twind-apidoc-stack';

const app = new cdk.App();

const env = {
  account: '602259773298',
  region: 'eu-west-1',
};

const certStack = new TwindApidocCertStack(app, 'TwindApidocCertStack', {
  env: { account: '602259773298', region: 'us-east-1' },
  crossRegionReferences: true,
});

new TwindApidocStack(app, 'TwindApidocStack', {
  env,
  certificateArn: certStack.certificateArn,
  // Set enableDnsAlias: true only at DNS cutover step
  enableDnsAlias: false,
});
```

- [ ] **Step 5: Run all tests**

```bash
cd infra && npm test
```

Expected: All tests PASS.

- [ ] **Step 6: Verify synth compiles**

```bash
cd infra && npx cdk synth --app "npx ts-node --prefer-ts-exts bin/app.ts" 2>&1 | head -30
```

Expected: CloudFormation JSON/YAML output, no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add infra/lib/twind-apidoc-stack.ts infra/bin/app.ts infra/test/twind-apidoc-main-stack.test.ts
git commit -m "feat(infra): add TwindApidocStack and CDK app entry point"
```

---

## Task 8: GitHub Actions publish workflow

**Files:**
- Create: `.github/workflows/publish.yml`

Note: There is no test for this file. Correctness is verified by running the workflow in CI after deployment.

- [ ] **Step 1: Create `.github/workflows/publish.yml`**

```yaml
name: Publish to S3

on:
  release:
    types: [published]

permissions:
  id-token: write
  contents: read

jobs:
  publish:
    name: Sync site to S3 and invalidate CloudFront
    runs-on: ubuntu-latest

    steps:
      - name: Checkout release tag
        uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::602259773298:role/twind-apidoc-github-deploy-role
          aws-region: eu-west-1

      - name: Sync site files to S3
        run: |
          aws s3 sync . s3://twind-apidoc-assets-bucket-prod --delete \
            --exclude ".git/*" \
            --exclude ".github/*" \
            --exclude "infra/*" \
            --exclude "node_modules/*" \
            --exclude "README.md" \
            --exclude ".gitignore" \
            --exclude "CNAME" \
            --exclude "docs/*"

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ vars.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

> **Note:** `vars.CLOUDFRONT_DISTRIBUTION_ID` must be set as a GitHub Actions repository variable after the CDK stack is deployed (value comes from the `DistributionId` stack output).

- [ ] **Step 2: Add `.github/` and `docs/` to gitignore exclusion awareness**

The publish workflow already excludes `docs/*` from the S3 sync. No gitignore changes needed.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/publish.yml
git commit -m "feat: add GitHub Actions publish workflow (release-triggered S3 sync)"
```

---

## Task 9: Update `.gitignore` for infra build artifacts

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Append infra build artifacts to `.gitignore`**

```
# CDK infra
infra/node_modules/
infra/dist/
infra/cdk.out/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore infra build artifacts"
```

---

## Self-Review Against Spec

| Spec requirement | Covered by |
|---|---|
| S3 bucket `twind-apidoc-assets-bucket-prod`, private, BLOCK_ALL, BUCKET_OWNER_ENFORCED, S3-managed encryption, RETAIN | Task 2 — `ApidocBucket` |
| CloudFront OAI, defaultRootObject, REDIRECT_TO_HTTPS, compress, ALLOW_GET_HEAD, alias, cert | Task 4 — `ApidocDistribution` |
| CloudFront Function (viewer-request) dir-index rewrite | Task 4 — `ApidocDistribution` (inline JS code) |
| ACM cert `api-doc.twind.io` in `us-east-1`, DNS-validated | Task 3 — `TwindApidocCertStack` |
| Route 53 alias A+AAAA, created only at cutover | Task 5 — `ApidocDns`, `enableDnsAlias: false` in app.ts |
| GitHub OIDC role, trust scoped to `twind-ops/TwindApi-PublicOpenApi`, S3 + CF perms | Task 6 — `GithubOidcRole` |
| Publish workflow: trigger `release: published`, checkout, OIDC, s3 sync with excludes, CF invalidation | Task 8 — `publish.yml` |
| Exclude CNAME from sync | Task 8 — `--exclude "CNAME"` |
| `DistributionId` output for smoke testing | Task 7 — `CfnOutput` in `TwindApidocStack` |
| CDK structure: `infra/bin`, `infra/lib`, `infra/lib/constructs` | Tasks 1–7 |
| `infra/` isolated from published output | Task 8 — `--exclude "infra/*"` |
