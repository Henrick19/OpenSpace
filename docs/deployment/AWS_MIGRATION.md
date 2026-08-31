# AWS migration plan

The first MVP should be developed locally. Migration to AWS should begin only after the school and AWS team confirm the account, region, sponsorship, available services and security responsibilities.

## Stage A — local MVP

```text
React on localhost → Node.js service on localhost → OpenSpace private API
```

The Node.js service will protect OpenSpace credentials and coordinate the upload workflow. OpenSpace will store and process the submitted capture. The PSB frontend will monitor status and, subject to confirmed API support, provide navigation to the processed result.

## Stage B — hosted frontend

The static React build may be hosted with AWS Amplify Hosting. Amazon Cognito may later protect the PSB dashboard, but the PSB account and OpenSpace user account should remain separate authentication systems.

## Stage C — hosted integration service

The Node.js integration should run on a service suitable for long-running, large-file streaming. The final hosting service remains an AWS architecture decision.

Do not send multi-gigabyte INSV files through AWS Lambda or API Gateway. Their request and runtime limits are not suitable for the main capture upload path.

## Possible AWS responsibilities

- **AWS Amplify Hosting:** deploy the React application.
- **Amazon Cognito:** authenticate users of the PSB dashboard.
- **Managed container hosting:** run the Node.js integration and uploader.
- **AWS Secrets Manager:** store OpenSpace organisation credentials for the hosted service.
- **Amazon S3:** optionally retain an authorised research copy of original captures or derived data.
- **AWS IoT Core:** ingest robot and sensor telemetry separately from OpenSpace capture processing.
- **Time-series storage:** retain sensor measurements for dashboards and later analysis.
- **Amazon CloudWatch:** provide redacted logs, metrics and alarms.
- **Amazon SageMaker AI or an approved alternative:** support later machine-learning work after data and assessment requirements are confirmed.

## Authentication boundary

```text
PSB user → Cognito → PSB React dashboard
Hosted service role → Secrets Manager → OpenSpace credentials → OpenSpace API
```

The React application must never read Secrets Manager directly.

## Optional S3 research copy

If approved, the upload service may copy the original INSV file to a protected S3 bucket before or while submitting it to OpenSpace. This research copy is separate from OpenSpace storage and processing. Encryption, access control, lifecycle rules, retention approval and cost limits must be agreed first.

## Migration checklist

- Confirm the AWS account, Singapore region and environment owner.
- Confirm which services are included in the collaboration.
- Agree development, test and production boundaries.
- Store server secrets in Secrets Manager, never in frontend variables.
- Select a hosting service appropriate for large-file streaming.
- Configure least-privilege IAM roles.
- Confirm data-retention approval before enabling an S3 research copy.
- Add logs that redact credentials, authorization headers and personal information.
- Test the hosted system with non-sensitive mock data before any live capture.
