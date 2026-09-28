# Production readiness

CareBridge is a demo. Do not use it for real care or live payments without a separate production program.

- **Legal and clinical:** Determine the market's healthcare regulation, prescription rules, data residency, retention and audit requirements; assess HIPAA/GDPR where applicable. Verify patient and provider identity, doctor credentials, organizations, and pharmacy licenses before listing. Define clinical safety review and incident processes.
- **Data security:** Encrypt sensitive data in transit and at rest; manage secrets outside source control; harden authentication and API authorization, add rate limiting and a WAF, review session handling, and run independent security testing.
- **Real integrations:** Replace simulated payments/refunds, delivery/logistics, video consultation, and mock SMS/email with contracted providers. Add reconciliation, failure handling, and monitoring for each integration.
- **Operations:** Add structured observability and alerting, tested backups and disaster recovery, cloud deployment automation, and operational audit retention. Plan capacity, database scaling, and multi-region architecture only after residency and recovery requirements are set.

The current demo reset, seed data, mock documents/reports, and shared demo password are for development presentations only.
