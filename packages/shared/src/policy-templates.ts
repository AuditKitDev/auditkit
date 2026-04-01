export interface PolicyTemplate {
  title: string;
  slug: string;
  category: string;
  description: string;
  content: string;
  relatedControls: string[];
}

export const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    title: 'Information Security Policy',
    slug: 'information-security',
    category: 'security',
    description: 'Establishes the foundation for protecting company information assets and systems.',
    relatedControls: ['CC1.1', 'CC1.2', 'CC5.3'],
    content: `# Information Security Policy

## Purpose

This policy establishes the framework for protecting [Company Name]'s information assets, systems, and data from unauthorized access, disclosure, alteration, or destruction.

## Scope

This policy applies to all employees, contractors, and third parties who access [Company Name]'s information systems or handle company data.

## Policy

### Governance

- [Company Name] maintains an information security program led by a designated security owner (CISO, Head of Engineering, or equivalent).
- Security objectives are reviewed quarterly and aligned with business goals.
- Management formally acknowledges their responsibility for maintaining the security program.

### Core Principles

1. **Least Privilege** — Access is granted based on job function and revoked when no longer needed.
2. **Defense in Depth** — Multiple layers of security controls protect critical assets.
3. **Secure by Default** — Systems are deployed with secure configurations. Exceptions require documented approval.
4. **Transparency** — Security incidents and risks are reported honestly and promptly.

### Security Controls

- All production systems require multi-factor authentication (MFA).
- Data in transit and at rest must be encrypted using industry-standard algorithms.
- Security events are logged, monitored, and retained for a minimum of 90 days.
- Vulnerability scans run at least monthly; critical findings are remediated within 7 days.

### Risk Management

- A formal risk assessment is performed annually and after significant changes.
- Identified risks are documented in a risk register with assigned owners and remediation timelines.

## Responsibilities

- **Security Owner**: Maintains and enforces this policy, reports to leadership.
- **Engineering**: Implements technical controls and responds to security events.
- **All Staff**: Follow security policies, complete training, and report suspicious activity.

## Review

This policy is reviewed annually or after a significant security event, whichever comes first.

## Exceptions

Exceptions require written approval from the security owner and must include a compensating control and an expiration date.`,
  },
  {
    title: 'Acceptable Use Policy',
    slug: 'acceptable-use',
    category: 'security',
    description: 'Defines acceptable behavior when using company systems, devices, and data.',
    relatedControls: ['CC1.4', 'CC2.1'],
    content: `# Acceptable Use Policy

## Purpose

This policy defines acceptable and unacceptable use of [Company Name]'s technology resources to protect the company, its employees, and its customers.

## Scope

This policy applies to all employees, contractors, and anyone using [Company Name]-owned or managed devices, networks, or accounts.

## Policy

### General Use

- Company systems are provided primarily for business purposes. Incidental personal use is permitted as long as it does not interfere with work or violate this policy.
- Users are responsible for the security of their accounts and devices. Never share credentials or leave devices unlocked and unattended.
- All company data remains the property of [Company Name], even if stored on personal devices.

### Prohibited Activities

The following are strictly prohibited:

1. Sharing or reusing passwords across services.
2. Installing unauthorized software on company devices without approval.
3. Accessing systems or data beyond what your role requires.
4. Transmitting confidential data via unapproved channels (personal email, USB drives, unauthorized cloud storage).
5. Attempting to bypass security controls, disable endpoint protection, or circumvent monitoring.
6. Using company resources for illegal activity, harassment, or anything that violates [Company Name]'s code of conduct.

### Email and Communication

- Be cautious with links and attachments from unknown senders. Report phishing attempts to the security team immediately.
- Do not auto-forward company email to personal accounts.
- Use approved communication tools (e.g., Slack, company email) for business discussions.

### Personal Devices (BYOD)

- Personal devices accessing company data must have screen lock enabled and OS updates applied within 7 days of release.
- [Company Name] reserves the right to remotely wipe company data from personal devices upon offboarding.

## Responsibilities

- **All Staff**: Read, understand, and follow this policy. Report violations.
- **Managers**: Ensure their teams are aware of and comply with this policy.
- **IT/Security**: Monitor compliance and investigate reported violations.

## Review

This policy is reviewed annually. Violations may result in disciplinary action, up to and including termination.

## Exceptions

Exceptions must be approved in writing by the security owner or department head.`,
  },
  {
    title: 'Access Control Policy',
    slug: 'access-control',
    category: 'access',
    description: 'Governs how access to systems, applications, and data is granted, reviewed, and revoked.',
    relatedControls: ['CC6.1', 'CC6.2', 'CC6.3'],
    content: `# Access Control Policy

## Purpose

This policy ensures that access to [Company Name]'s systems, applications, and data is granted on a least-privilege basis and promptly revoked when no longer needed.

## Scope

This policy covers all systems, applications, cloud services, and data repositories used by [Company Name].

## Policy

### Access Provisioning

- Access is granted based on job role and business need. Requests must be approved by the employee's manager.
- New hires receive access only to the systems required for their role, provisioned through a documented onboarding checklist.
- Privileged access (admin, root, production database) requires additional approval from the security owner or engineering lead.

### Authentication Requirements

- All systems must enforce multi-factor authentication (MFA) where supported.
- Shared accounts are prohibited. Each user must have a unique, identifiable account.
- Service accounts must be documented, scoped to minimum necessary permissions, and reviewed quarterly.

### Access Reviews

- User access is reviewed quarterly by system owners and managers.
- Privileged access is reviewed monthly.
- Reviewers confirm each user still needs access and that permission levels are appropriate. Unnecessary access is revoked within 48 hours of review.

### Access Revocation

- Access is revoked within 24 hours of an employee's departure (same day for involuntary terminations).
- Role changes trigger an access review within 5 business days — old permissions are removed and new permissions are granted as needed.
- Offboarding checklists must confirm revocation across all systems (SSO, cloud providers, code repositories, SaaS tools).

### Logging

- Authentication events (logins, failures, MFA challenges) are logged and retained for at least 90 days.
- Privileged actions are logged separately and reviewed for anomalies.

## Responsibilities

- **Managers**: Approve access requests and participate in quarterly reviews.
- **System Owners**: Maintain accurate access lists and enforce controls.
- **IT/Security**: Execute provisioning and revocation, maintain audit logs.
- **All Staff**: Use only the access granted to them and report unauthorized access.

## Review

This policy is reviewed annually or when a significant change occurs in systems or organizational structure.

## Exceptions

Temporary elevated access may be granted for incident response with security owner approval. It must be time-limited and logged.`,
  },
  {
    title: 'Password Policy',
    slug: 'password-policy',
    category: 'access',
    description: 'Sets requirements for creating, managing, and protecting passwords across all systems.',
    relatedControls: ['CC6.1', 'CC6.6'],
    content: `# Password Policy

## Purpose

This policy establishes requirements for creating and managing strong passwords to protect [Company Name]'s systems and data from unauthorized access.

## Scope

This policy applies to all employees, contractors, and system accounts used to access [Company Name]'s systems and services.

## Policy

### Password Requirements

- Minimum length: 12 characters (16+ recommended).
- Passwords must not be on common password lists (e.g., "password123", "companyname2024").
- Passphrases (multiple random words) are encouraged over complex character substitutions.
- Passwords must not contain the user's name, email, or other easily guessable personal information.

### Password Management

- All employees must use the company-approved password manager to generate and store passwords.
- Every account must have a unique password. Reusing passwords across services is prohibited.
- Passwords must never be shared via email, Slack, text, or any unencrypted channel. Use the password manager's secure sharing feature.
- Passwords must never be stored in plaintext — no spreadsheets, sticky notes, or code repositories.

### Multi-Factor Authentication

- MFA is required on all systems that support it, with no exceptions.
- Preferred MFA methods (in order): hardware security keys, authenticator apps, push notifications. SMS-based MFA is discouraged and prohibited for privileged accounts.
- Backup MFA recovery codes must be stored securely in the password manager.

### System and Service Accounts

- Service account credentials must be stored in a secrets manager (e.g., environment variables via a vault, not hardcoded).
- Service account passwords or API keys must be rotated at least annually or immediately if compromise is suspected.

### Compromised Credentials

- If a password is suspected or confirmed compromised, it must be changed immediately and the security team notified.
- [Company Name] may run credential breach checks periodically and require password resets for exposed accounts.

## Responsibilities

- **All Staff**: Follow password requirements, use the password manager, enable MFA.
- **IT/Security**: Enforce password policies technically where possible, manage the password manager, and respond to compromises.

## Review

This policy is reviewed annually. Password requirements are updated based on current NIST guidelines and threat landscape.

## Exceptions

None. MFA and password manager usage have no exceptions.`,
  },
  {
    title: 'Change Management Policy',
    slug: 'change-management',
    category: 'change-mgmt',
    description: 'Controls how changes to production systems, infrastructure, and code are proposed, reviewed, and deployed.',
    relatedControls: ['CC8.1'],
    content: `# Change Management Policy

## Purpose

This policy ensures that changes to [Company Name]'s production systems, infrastructure, and codebase are planned, reviewed, tested, and deployed in a controlled manner to minimize risk.

## Scope

This policy applies to all changes affecting production environments, including application code, infrastructure configuration, database schemas, third-party integrations, and access control settings.

## Policy

### Change Categories

1. **Standard Changes** — Low-risk, routine changes that follow an established process (e.g., dependency updates, minor UI fixes). These follow the normal PR workflow.
2. **Significant Changes** — Changes that affect architecture, security, data models, or external integrations. These require additional review and approval.
3. **Emergency Changes** — Urgent fixes for production incidents. These may bypass normal review but must be documented and reviewed retroactively within 48 hours.

### Change Process

All standard and significant changes must:

1. **Be documented** — A pull request (PR) or change ticket describing what is changing and why.
2. **Be reviewed** — At least one peer review is required. Significant changes require review from a senior engineer or team lead.
3. **Be tested** — Automated tests must pass. Significant changes require manual testing or staging deployment.
4. **Be approved** — The reviewer explicitly approves the change before merge.
5. **Be deployed through CI/CD** — Manual production deployments are prohibited except during emergencies.

### Rollback

- Every deployment must have a documented rollback plan (even if it is "revert the commit").
- Rollbacks should be executable within 15 minutes.
- Failed deployments are rolled back immediately; root cause analysis follows.

### Database Changes

- Schema migrations must be backward-compatible (no dropping columns in the same release they stop being used).
- Data migrations are tested against a copy of production data before execution.

### Infrastructure Changes

- Infrastructure-as-code (IaC) is required. Manual changes to production infrastructure are prohibited.
- Infrastructure changes follow the same PR review process as code changes.

## Responsibilities

- **Engineers**: Follow the change process, write clear PR descriptions, and test changes.
- **Reviewers**: Evaluate changes for correctness, security, and risk.
- **On-Call/Ops**: Monitor deployments and execute rollbacks when needed.

## Review

This policy is reviewed annually or after a significant incident related to a change.

## Exceptions

Emergency changes bypass normal review but must be retroactively documented and reviewed within 48 hours.`,
  },
  {
    title: 'Incident Response Policy',
    slug: 'incident-response',
    category: 'incident',
    description: 'Defines how security incidents are detected, reported, contained, and resolved.',
    relatedControls: ['CC7.3', 'CC7.4', 'CC7.5'],
    content: `# Incident Response Policy

## Purpose

This policy defines how [Company Name] detects, responds to, contains, and recovers from security incidents to minimize damage and restore normal operations.

## Scope

This policy covers all security events and incidents affecting [Company Name]'s systems, data, or operations, including unauthorized access, data breaches, malware, denial of service, and insider threats.

## Policy

### Definitions

- **Security Event**: Any observable occurrence relevant to security (e.g., a failed login attempt).
- **Security Incident**: A security event that results in or poses an imminent threat of unauthorized access, data loss, or system compromise.

### Severity Levels

- **Critical (S1)**: Active data breach, production system compromise, or ransomware. Response within 15 minutes.
- **High (S2)**: Suspected breach, unauthorized access to sensitive data, or significant service degradation. Response within 1 hour.
- **Medium (S3)**: Attempted unauthorized access, phishing targeting employees, or policy violation. Response within 4 hours.
- **Low (S4)**: Minor policy violations, scan alerts with no confirmed impact. Response within 1 business day.

### Incident Response Process

1. **Detection & Reporting** — Anyone who suspects an incident reports it immediately via the designated channel (e.g., #security-incidents in Slack or email to security@[Company Name].com). Do not attempt to investigate alone.
2. **Triage** — The on-call responder assesses severity, assigns an incident lead, and opens an incident ticket.
3. **Containment** — Take immediate steps to limit damage: isolate affected systems, revoke compromised credentials, block malicious IPs. Preserve evidence.
4. **Investigation** — Determine root cause, scope of impact, and affected data. Document findings in the incident ticket.
5. **Recovery** — Restore affected systems, verify integrity, and monitor for recurrence.
6. **Post-Mortem** — Conduct a blameless post-mortem within 5 business days. Document lessons learned and assign follow-up actions with deadlines.

### Communication

- Affected customers are notified within 72 hours of confirming a data breach, or sooner if required by law.
- Internal stakeholders are updated at least every 4 hours during active S1/S2 incidents.
- All external communications go through a designated spokesperson.

### Evidence Preservation

- Logs, screenshots, and artifacts are preserved and stored securely. Do not modify or delete potential evidence.

## Responsibilities

- **All Staff**: Report suspected incidents immediately.
- **Incident Lead**: Coordinates response, communication, and post-mortem.
- **Security Owner**: Ensures the incident response plan is current and tested.

## Review

This policy is reviewed annually. Tabletop exercises are conducted at least once per year.

## Exceptions

None. All suspected incidents must be reported.`,
  },
  {
    title: 'Data Classification Policy',
    slug: 'data-classification',
    category: 'data',
    description: 'Defines how data is categorized based on sensitivity and the handling requirements for each level.',
    relatedControls: ['C1.1', 'CC6.7'],
    content: `# Data Classification Policy

## Purpose

This policy establishes a data classification framework so that [Company Name] employees handle, store, and transmit data according to its sensitivity level.

## Scope

This policy applies to all data created, collected, stored, or processed by [Company Name], regardless of format (digital, paper, verbal).

## Policy

### Classification Levels

#### Public
- Data intended for public consumption (marketing content, public documentation, blog posts).
- No special handling required.

#### Internal
- Data meant for internal use that is not sensitive but should not be shared publicly (internal wikis, meeting notes, project plans).
- Store on company-approved systems. No special encryption required beyond standard controls.

#### Confidential
- Sensitive business data (financial records, employee data, customer lists, source code, API keys, contracts).
- Must be encrypted in transit and at rest. Access restricted to those with a business need. Do not share externally without authorization.

#### Restricted
- Highly sensitive data where disclosure could cause significant harm (customer PII, passwords, authentication secrets, health data, payment card data).
- Must be encrypted at all times. Access strictly limited and logged. Never stored in local files, Slack messages, or email. Must be handled according to applicable regulations (GDPR, CCPA, PCI-DSS).

### Handling Requirements

| Requirement | Public | Internal | Confidential | Restricted |
|---|---|---|---|---|
| Encryption in transit | Recommended | Required | Required | Required |
| Encryption at rest | No | No | Required | Required |
| Access logging | No | No | Recommended | Required |
| Sharing externally | Allowed | With caution | Requires approval | Prohibited without legal review |
| Retention limits | None | Per retention policy | Per retention policy | Strict — per retention policy |

### Labeling

- Documents and repositories containing Confidential or Restricted data should be labeled accordingly (e.g., folder name, document header, or repository description).
- When in doubt, classify data at the higher level.

### Data Ownership

- Every data set should have an identified owner responsible for its classification and access decisions.
- Owners review classification annually or when the nature of the data changes.

## Responsibilities

- **Data Owners**: Classify data, approve access, review classification annually.
- **All Staff**: Handle data according to its classification, ask when unsure.
- **Security Team**: Provide guidance, audit compliance, and respond to mishandling.

## Review

This policy is reviewed annually.

## Exceptions

Exceptions to handling requirements require written approval from the data owner and the security owner.`,
  },
  {
    title: 'Data Retention Policy',
    slug: 'data-retention',
    category: 'data',
    description: 'Specifies how long different types of data are retained and how they are securely disposed of.',
    relatedControls: ['C1.2'],
    content: `# Data Retention Policy

## Purpose

This policy defines how long [Company Name] retains different categories of data and how data is securely disposed of when no longer needed, ensuring compliance with legal obligations and minimizing risk.

## Scope

This policy applies to all data stored by [Company Name] in any system, including production databases, backups, logs, email, documents, and third-party services.

## Policy

### Retention Periods

| Data Type | Retention Period | Notes |
|---|---|---|
| Customer account data | Duration of account + 30 days | Deleted upon account closure + grace period |
| Customer-generated content | Duration of account + 30 days | Exported upon request before deletion |
| Application logs | 90 days | Extended to 1 year for security-relevant logs |
| Security and audit logs | 1 year | Required for compliance and investigations |
| Financial and billing records | 7 years | Tax and legal requirements |
| Employee records | Duration of employment + 3 years | Follows applicable labor laws |
| Recruitment data (non-hired) | 1 year | Candidates may request earlier deletion |
| Marketing analytics | 2 years | Aggregated and anonymized where possible |
| Backups | 90 days | Rotated automatically; oldest backups purged |
| Contracts and legal documents | Duration of agreement + 5 years | Consult legal for specific requirements |

### Data Minimization

- Collect only the data needed for the stated purpose. Do not collect data "just in case."
- Periodically review stored data and delete what is no longer needed.
- Anonymize or aggregate data when the original detail is no longer required.

### Secure Disposal

- Digital data must be deleted using methods that prevent recovery (e.g., cryptographic erasure, secure delete APIs).
- When decommissioning hardware or storage, ensure data is wiped before disposal.
- Third-party vendors must confirm data deletion in writing upon contract termination.
- Backups containing deleted data are purged through normal rotation cycles.

### Legal Holds

- If [Company Name] is subject to litigation or regulatory investigation, relevant data must be preserved regardless of retention schedules. The security owner or legal counsel will issue a legal hold notice.

## Responsibilities

- **Data Owners**: Know what data their systems store and ensure retention schedules are followed.
- **Engineering**: Implement automated deletion and retention enforcement.
- **Security/Compliance**: Audit retention compliance and manage legal holds.
- **All Staff**: Do not retain data beyond its retention period. Delete local copies when no longer needed.

## Review

This policy is reviewed annually and updated to reflect changes in regulations or business requirements.

## Exceptions

Exceptions require approval from the security owner and, if legally relevant, legal counsel.`,
  },
  {
    title: 'Encryption Policy',
    slug: 'encryption',
    category: 'security',
    description: 'Defines requirements for encrypting data in transit, at rest, and in use across all systems.',
    relatedControls: ['CC6.6', 'CC6.7'],
    content: `# Encryption Policy

## Purpose

This policy ensures that [Company Name] uses encryption to protect sensitive data from unauthorized access, whether data is in transit, at rest, or stored in backups.

## Scope

This policy applies to all systems, applications, and services operated by [Company Name] that store, process, or transmit Confidential or Restricted data (as defined by the Data Classification Policy).

## Policy

### Data in Transit

- All external network communications must use TLS 1.2 or higher. TLS 1.0 and 1.1 are prohibited.
- Internal service-to-service communication must use TLS or equivalent encrypted transport.
- API endpoints must enforce HTTPS. HTTP connections must redirect to HTTPS or be rejected.
- Email containing Confidential or Restricted data should use TLS-enforced delivery.

### Data at Rest

- All Confidential and Restricted data must be encrypted at rest using AES-256 or equivalent.
- Database encryption must be enabled (e.g., Neon/PostgreSQL encryption, cloud provider managed encryption).
- File storage (S3, GCS, etc.) must have server-side encryption enabled by default.
- Full-disk encryption must be enabled on all company laptops and workstations.
- Backups must be encrypted with the same or stronger standards as the source data.

### Key Management

- Encryption keys must be managed through a dedicated key management service (cloud provider KMS or equivalent). Keys must never be stored in source code, environment files committed to repositories, or plaintext documents.
- Key access is restricted to authorized personnel and service accounts.
- Encryption keys are rotated at least annually. Keys for Restricted data are rotated every 6 months.
- Compromised keys are revoked and rotated immediately. Affected data is re-encrypted.
- Key management events (creation, rotation, deletion, access) are logged.

### Prohibited Practices

- Custom or homegrown encryption algorithms are prohibited. Use established libraries and standards.
- Storing unencrypted secrets (API keys, passwords, tokens) in code repositories, Slack, email, or shared documents is prohibited.

### Certificates

- TLS certificates are managed centrally and set to auto-renew where possible.
- Certificate expiration is monitored, with alerts at least 30 days before expiry.

## Responsibilities

- **Engineering**: Implement and maintain encryption controls in applications and infrastructure.
- **Security Owner**: Define encryption standards, audit compliance, manage key rotation.
- **All Staff**: Do not circumvent encryption or transmit sensitive data over unencrypted channels.

## Review

This policy is reviewed annually or when encryption standards are updated (e.g., new NIST guidance).

## Exceptions

Exceptions require written approval from the security owner, including justification and compensating controls.`,
  },
  {
    title: 'Vendor Management Policy',
    slug: 'vendor-management',
    category: 'vendor',
    description: 'Establishes how third-party vendors are evaluated, monitored, and managed for security risk.',
    relatedControls: ['CC9.2'],
    content: `# Vendor Management Policy

## Purpose

This policy defines how [Company Name] evaluates, selects, and monitors third-party vendors to ensure they meet security and compliance requirements before accessing company data or systems.

## Scope

This policy applies to all third-party vendors, service providers, and contractors who access, store, process, or transmit [Company Name]'s data or integrate with [Company Name]'s systems.

## Policy

### Vendor Classification

Vendors are classified by risk level based on their access to data and systems:

- **High Risk**: Vendors with access to Restricted or Confidential data, production systems, or customer data (e.g., cloud providers, payment processors, database hosting).
- **Medium Risk**: Vendors with access to Internal data or non-production systems (e.g., project management tools, analytics platforms).
- **Low Risk**: Vendors with no access to company data or systems (e.g., office supplies, general consultants).

### Vendor Assessment

Before onboarding a new vendor:

1. **High Risk**: Require SOC 2 Type II report (or equivalent), review their security policies, and complete a security questionnaire. Legal review of the contract and data processing agreement (DPA) is required.
2. **Medium Risk**: Require SOC 2 report or completion of a security questionnaire. DPA required if processing personal data.
3. **Low Risk**: No formal security review required.

### Ongoing Monitoring

- High-risk vendors are reviewed annually. Updated SOC 2 reports and security questionnaires are collected.
- Medium-risk vendors are reviewed every two years.
- Monitor vendor security advisories, breach notifications, and public incident disclosures.
- If a vendor experiences a breach affecting [Company Name]'s data, trigger the Incident Response Policy immediately.

### Contractual Requirements

All contracts with high and medium-risk vendors must include:

- Data protection and confidentiality obligations.
- Breach notification requirements (within 48 hours).
- Right to audit or request evidence of security controls.
- Data return or deletion upon contract termination.
- Compliance with applicable regulations.

### Vendor Offboarding

- Revoke all vendor access to systems and data upon contract termination.
- Confirm data deletion or return in writing.
- Remove vendor integrations and API keys.

## Responsibilities

- **Procurement/Requester**: Identify vendor risk level and initiate the assessment process.
- **Security Owner**: Conduct or review security assessments, approve high-risk vendors.
- **Legal**: Review contracts and DPAs for high-risk vendors.
- **System Owners**: Manage vendor access and integrations.

## Review

This policy is reviewed annually. The vendor inventory is maintained and updated as vendors are added or removed.

## Exceptions

Exceptions for skipping vendor assessment steps require written approval from the security owner with documented justification.`,
  },
  {
    title: 'Business Continuity Policy',
    slug: 'business-continuity',
    category: 'bcp',
    description: 'Ensures critical business operations can continue during and recover from disruptive events.',
    relatedControls: ['A1.1', 'A1.2', 'A1.3'],
    content: `# Business Continuity Policy

## Purpose

This policy ensures that [Company Name] can maintain critical business operations during disruptions and recover within acceptable timeframes.

## Scope

This policy applies to all systems, processes, and teams that support [Company Name]'s critical business operations, including production infrastructure, customer-facing services, and essential internal tools.

## Policy

### Business Impact Analysis

- [Company Name] maintains a list of critical systems and services ranked by business impact.
- For each critical system, the following are defined:
  - **Recovery Time Objective (RTO)**: Maximum acceptable downtime. Target: 4 hours for critical services.
  - **Recovery Point Objective (RPO)**: Maximum acceptable data loss. Target: 1 hour for critical data.

### Backup and Recovery

- Production databases are backed up automatically at least daily, with point-in-time recovery enabled.
- Backups are stored in a geographically separate region from the primary data.
- Backup restoration is tested at least quarterly to verify recoverability and data integrity.
- Infrastructure is defined as code and can be redeployed to a new region if needed.

### Availability

- Critical services are deployed with redundancy (multiple instances, availability zones, or regions).
- Monitoring and alerting are configured for all critical systems with on-call rotation.
- Automated health checks detect failures and trigger recovery (e.g., container restarts, failover).

### Disaster Scenarios

[Company Name] plans for the following scenarios:

1. **Cloud provider outage**: Runbooks for failing over to alternate regions or providers.
2. **Data loss or corruption**: Restore from backups; point-in-time recovery procedures documented.
3. **Security breach**: Follow the Incident Response Policy; isolate affected systems.
4. **Key personnel unavailability**: Cross-training and documented procedures ensure no single point of failure.
5. **Third-party service failure**: Identify critical vendor dependencies and maintain fallback plans.

### Communication During Disruptions

- Customers are notified via status page within 30 minutes of confirmed critical service disruption.
- Internal communication uses a pre-designated backup channel if primary tools are unavailable.
- A designated incident commander coordinates response and communication.

### Testing

- Disaster recovery procedures are tested at least annually through tabletop exercises or live drills.
- Test results are documented, and gaps are addressed within 30 days.

## Responsibilities

- **Security Owner / CTO**: Maintains the business continuity plan and ensures testing.
- **Engineering**: Implements backup, redundancy, and recovery mechanisms.
- **All Staff**: Know their role during a disruption and participate in drills when required.

## Review

This policy is reviewed annually and after any significant disruption or disaster recovery test.

## Exceptions

No exceptions for backup and recovery requirements on critical systems.`,
  },
  {
    title: 'Risk Assessment Policy',
    slug: 'risk-assessment',
    category: 'security',
    description: 'Defines how security and operational risks are identified, evaluated, and managed.',
    relatedControls: ['CC3.1', 'CC3.2', 'CC3.3'],
    content: `# Risk Assessment Policy

## Purpose

This policy establishes how [Company Name] identifies, evaluates, and manages risks to its information systems, data, and operations to maintain an acceptable risk posture.

## Scope

This policy applies to all systems, processes, and activities within [Company Name], including technology, operations, compliance, and third-party relationships.

## Policy

### Risk Assessment Frequency

- A comprehensive risk assessment is performed at least annually.
- Additional assessments are triggered by significant changes such as new product launches, infrastructure changes, entering new markets, major vendor changes, or security incidents.
- The risk register is reviewed and updated quarterly.

### Risk Identification

Risks are identified through:

- Review of system architecture and data flows.
- Vulnerability scans and penetration testing results.
- Industry threat intelligence and advisories.
- Audit findings and compliance gaps.
- Input from engineering, product, and business teams.
- Vendor risk assessments.

### Risk Evaluation

Each identified risk is evaluated on two dimensions:

- **Likelihood**: How probable is it that this risk will materialize? (Low / Medium / High)
- **Impact**: What is the potential business impact if it does? (Low / Medium / High)

Risk score = Likelihood x Impact, resulting in a priority rating:

- **Critical**: Requires immediate action — remediation plan within 7 days.
- **High**: Remediation plan within 30 days.
- **Medium**: Remediation plan within 90 days, or accept with documented rationale.
- **Low**: Monitor and address during normal operations.

### Risk Treatment

For each identified risk, one of the following approaches is chosen and documented:

1. **Mitigate**: Implement controls to reduce likelihood or impact.
2. **Accept**: Acknowledge the risk with documented justification and approval from leadership.
3. **Transfer**: Shift the risk to a third party (e.g., insurance, vendor SLA).
4. **Avoid**: Eliminate the risk by discontinuing the activity.

### Risk Register

- All identified risks are recorded in the risk register with: description, owner, likelihood, impact, treatment approach, status, and target resolution date.
- The security owner maintains the risk register and reports on risk posture to leadership quarterly.

## Responsibilities

- **Security Owner**: Leads risk assessments, maintains the risk register, reports to leadership.
- **Engineering / System Owners**: Participate in risk identification, implement mitigations, own assigned risks.
- **Leadership**: Review risk posture quarterly, approve risk acceptance decisions.

## Review

This policy is reviewed annually. The risk register is a living document updated as risks change.

## Exceptions

Risk acceptance requires written approval from the security owner and a member of leadership.`,
  },
  {
    title: 'Remote Work Policy',
    slug: 'remote-work',
    category: 'security',
    description: 'Establishes security requirements for employees working outside the office or from personal networks.',
    relatedControls: ['CC6.4', 'CC6.8'],
    content: `# Remote Work Policy

## Purpose

This policy defines security requirements for [Company Name] employees and contractors who work remotely to ensure that company data and systems remain protected regardless of work location.

## Scope

This policy applies to all employees and contractors who access [Company Name]'s systems or data from outside a company-managed office, including home offices, co-working spaces, and travel.

## Policy

### Device Security

- Company-issued devices are preferred for accessing company systems and data. If personal devices are used, they must meet the requirements in the Acceptable Use Policy.
- All devices must have full-disk encryption enabled.
- Operating system and application updates must be installed within 7 days of release.
- Endpoint protection (antivirus/anti-malware) must be installed and active on all devices.
- Devices must be locked (screen lock) when unattended — auto-lock after 5 minutes maximum.

### Network Security

- Use a trusted, secured Wi-Fi network. Public Wi-Fi (cafes, airports, hotels) may only be used with the company VPN active.
- Home Wi-Fi networks must use WPA2 or WPA3 encryption with a strong, unique password.
- Do not access company systems from shared or public computers.

### Data Handling

- Confidential and Restricted data must not be stored on local devices unless absolutely necessary and encrypted.
- Printing Confidential or Restricted documents at home or public locations is discouraged. Printed materials must be securely shredded.
- Do not discuss Confidential business matters in public spaces where conversations can be overheard.
- Screen privacy filters are recommended when working in public spaces.

### Physical Security

- Company devices should not be left in vehicles, visible through windows, or in unsecured locations.
- Report lost or stolen devices immediately to the IT/security team (within 1 hour).

### Communication

- Use company-approved tools for all work communication (Slack, company email, video conferencing).
- Verify identities before sharing sensitive information, especially for requests received via email or phone — social engineering attempts target remote workers.

### Availability

- Remote workers must be reachable during agreed working hours and responsive to security-related communications.
- Ensure a reliable internet connection sufficient for required tools and video calls.

## Responsibilities

- **All Remote Workers**: Follow device, network, and data security requirements.
- **Managers**: Ensure their remote team members are equipped and aware of this policy.
- **IT/Security**: Provide secure tools, VPN access, and support for remote setups.

## Review

This policy is reviewed annually.

## Exceptions

Exceptions (e.g., use of personal devices without endpoint protection) require written approval from the security owner.`,
  },
  {
    title: 'Security Awareness Training Policy',
    slug: 'security-training',
    category: 'hr',
    description: 'Ensures all employees receive regular security training to recognize and respond to threats.',
    relatedControls: ['CC1.4', 'CC2.1'],
    content: `# Security Awareness Training Policy

## Purpose

This policy ensures that all [Company Name] employees and contractors receive regular security awareness training to recognize, prevent, and respond to security threats.

## Scope

This policy applies to all employees, contractors, and temporary staff who access [Company Name]'s systems or data.

## Policy

### Training Requirements

#### New Hire Training
- All new employees and contractors must complete security awareness training within their first 14 days.
- Training must be completed before access to production systems is granted.
- New hires must acknowledge they have read and understood [Company Name]'s key security policies (Information Security, Acceptable Use, Data Classification).

#### Annual Training
- All staff must complete security awareness training annually.
- Training must be completed within 30 days of assignment. Failure to complete training may result in access suspension.
- Completion is tracked and reported to management.

### Training Content

Training covers the following topics at minimum:

1. **Phishing and social engineering** — How to recognize and report suspicious emails, messages, and phone calls.
2. **Password security and MFA** — Creating strong passwords, using the password manager, enabling MFA.
3. **Data handling** — Proper classification, storage, and transmission of sensitive data.
4. **Acceptable use** — Appropriate use of company systems and devices.
5. **Incident reporting** — How and when to report security concerns or incidents.
6. **Remote work security** — Securing devices and networks when working outside the office.
7. **Physical security** — Protecting devices, locking workstations, visitor policies.

### Phishing Simulations

- [Company Name] conducts phishing simulations at least quarterly.
- Employees who click simulated phishing links receive immediate educational feedback.
- Repeated failures (3+ in a 12-month period) trigger additional targeted training.
- Simulation results are tracked to measure program effectiveness.

### Role-Specific Training

- Engineers with production access receive additional training on secure coding practices, secrets management, and infrastructure security.
- Managers receive training on access review responsibilities and recognizing insider threats.
- Customer-facing staff receive training on handling customer data and privacy requests.

### Records

- Training completion records are maintained for at least 2 years.
- Records include: employee name, training topic, completion date, and pass/fail status.

## Responsibilities

- **Security Owner**: Develops and maintains the training program, tracks completion, runs phishing simulations.
- **Managers**: Ensure their team members complete training on time.
- **All Staff**: Complete assigned training, apply what they learn, and report suspicious activity.

## Review

This policy is reviewed annually. Training content is updated to reflect current threats and lessons learned from incidents.

## Exceptions

No exceptions. All personnel with system access must complete security training.`,
  },
  {
    title: 'Privacy Policy',
    slug: 'privacy-policy',
    category: 'privacy',
    description: 'Defines how personal information is collected, used, shared, and protected in compliance with privacy regulations.',
    relatedControls: ['CC2.3'],
    content: `# Privacy Policy

## Purpose

This policy defines how [Company Name] collects, uses, stores, shares, and protects personal information in compliance with applicable privacy regulations (e.g., GDPR, CCPA) and as a commitment to our customers and employees.

## Scope

This policy applies to all personal information collected or processed by [Company Name], including data from customers, employees, contractors, prospects, and website visitors.

## Policy

### Data Collection

- [Company Name] collects only the personal information necessary for the stated business purpose.
- The purpose of data collection is communicated to individuals at or before the point of collection (e.g., via in-app notices, sign-up forms, or employee onboarding materials).
- Categories of personal data collected may include: name, email address, billing information, IP address, usage data, and employment information.

### Consent and Legal Basis

- Personal data is processed based on a lawful basis: consent, contractual necessity, legal obligation, or legitimate interest.
- Where consent is the basis, individuals can withdraw consent at any time through their account settings or by contacting [Company Name].
- Marketing communications require explicit opt-in consent and include an unsubscribe option.

### Data Use

- Personal information is used only for the purposes for which it was collected.
- Data is not sold to third parties. Period.
- Data may be shared with service providers (sub-processors) only as necessary to operate the service, subject to data processing agreements.

### Individual Rights

[Company Name] supports the following rights for individuals regarding their personal data:

- **Access**: Request a copy of their personal data.
- **Correction**: Request correction of inaccurate data.
- **Deletion**: Request deletion of their data (subject to legal retention requirements).
- **Portability**: Request data export in a machine-readable format.
- **Objection**: Object to processing based on legitimate interest.

Requests are fulfilled within 30 days. Requests can be submitted to privacy@[Company Name].com.

### Data Protection

- Personal data is protected according to the Data Classification Policy (typically classified as Confidential or Restricted).
- Encryption, access controls, and monitoring are applied as defined in related security policies.
- Data breaches involving personal information trigger notification procedures per the Incident Response Policy and applicable law.

### Sub-Processors

- A list of sub-processors is maintained and made available to customers upon request.
- Customers are notified of new sub-processors with reasonable advance notice.

### Employee Data

- Employee personal information is collected for employment, payroll, benefits, and legal compliance purposes.
- Access to employee data is restricted to HR and authorized personnel.

## Responsibilities

- **Security Owner / DPO**: Oversees privacy compliance, responds to data subject requests, maintains sub-processor list.
- **Product / Engineering**: Implements privacy-by-design principles, consent mechanisms, and data deletion capabilities.
- **All Staff**: Handle personal data according to this policy, report potential privacy issues.

## Review

This policy is reviewed annually and updated when regulations change or new data processing activities are introduced.

## Exceptions

No exceptions for core individual rights. Deviations from data handling procedures require approval from the security owner or DPO.`,
  },
];
