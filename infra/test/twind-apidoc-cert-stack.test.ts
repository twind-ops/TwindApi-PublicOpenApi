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
