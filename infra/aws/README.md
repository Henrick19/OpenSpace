# AWS infrastructure placeholder

No AWS resources or deployment code are included yet.

This folder is reserved for future infrastructure-as-code after the team confirms:

- the AWS account and Singapore region;
- the services covered by the school collaboration;
- development and production environment ownership;
- security, cost and data-retention controls;
- the hosting service for the large-file Node.js uploader.

When implementation is approved, infrastructure changes should be reviewed separately from application changes and must use least-privilege IAM roles. OpenSpace secrets must be retrieved at runtime from the approved secret manager.
