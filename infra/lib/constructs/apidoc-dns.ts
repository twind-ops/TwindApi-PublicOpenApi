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
