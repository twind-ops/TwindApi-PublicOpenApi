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
