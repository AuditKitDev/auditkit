export interface Soc2Control {
  framework: string;
  criteriaId: string;
  title: string;
  description: string;
  category: string;
  whatAuditorsWant: string;
  evidenceGuidance: string;
}

export const SOC2_CONTROLS: Soc2Control[] = [
  // ─────────────────────────────────────────────
  // CC1 — Control Environment
  // ─────────────────────────────────────────────
  {
    framework: 'soc2',
    criteriaId: 'CC1.1',
    title: 'CISO/Security Leadership Defined',
    description:
      'The entity demonstrates a commitment to integrity and ethical values by defining security leadership roles, such as a CISO or equivalent, responsible for overseeing the security program.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see that someone specific owns security at the organization. They will look for a named individual (e.g., CISO, VP of Security, Head of Engineering) whose job description explicitly includes security program oversight. They want proof this person has the authority to make security decisions and the resources to carry them out.',
    evidenceGuidance:
      'Upload the org chart showing who leads security. Provide the job description or offer letter for that person highlighting security responsibilities. If you have a security charter or memo from the CEO designating a security leader, include that too. A screenshot of the security team page from your internal wiki also works.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC1.2',
    title: 'Board Oversight of Security',
    description:
      'The board of directors (or equivalent governing body) demonstrates independence from management and exercises oversight over the development and performance of internal controls, including security.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want evidence that leadership above management (board, advisory board, or founders in a startup context) reviews and questions the security program. They want to see that security is not just a management initiative but has executive-level visibility and accountability.',
    evidenceGuidance:
      'Provide board meeting minutes or executive meeting notes where security was discussed. Include any security dashboards or reports presented to the board. If you are a startup without a formal board, show founder or leadership meeting notes where security posture was reviewed. Quarterly security summaries sent to leadership also count.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC1.3',
    title: 'Management Structure for Security',
    description:
      'Management establishes, with board oversight, structures, reporting lines, and appropriate authorities and responsibilities in the pursuit of security objectives.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to understand who reports to whom when it comes to security. They need to see a clear chain of command: who handles day-to-day security, who they report to, and how security concerns escalate to leadership.',
    evidenceGuidance:
      'Upload your organizational chart showing reporting lines for security-related roles. Include any RACI matrix or responsibility assignment document for security tasks. If you have an internal document describing security team structure or how security responsibilities are distributed across engineering, provide that.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC1.4',
    title: 'Competent Security Personnel',
    description:
      'The entity demonstrates a commitment to attract, develop, and retain competent individuals aligned with security objectives, including training and professional development.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see that people handling security are qualified and trained. They look for evidence of security awareness training completion, certifications held by security staff, and processes for keeping skills current.',
    evidenceGuidance:
      'Provide completion records for security awareness training (screenshots from your training platform showing all employees completed it). Include any security certifications held by team members (e.g., CISSP, AWS Security Specialty). Upload your training policy document showing the required training schedule (e.g., annual security awareness, onboarding training). New hire onboarding checklists that include security training are also useful.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC1.5',
    title: 'Accountability for Security Roles',
    description:
      'The entity holds individuals accountable for their internal control responsibilities, including security duties, through formal performance evaluation and consequences.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see that security is not optional. They look for evidence that security responsibilities appear in job descriptions, performance reviews, or employee handbooks, and that there are consequences for neglecting security duties.',
    evidenceGuidance:
      'Upload your employee handbook section covering security responsibilities and acceptable use. Provide a sample job description showing security duties. Include your code of conduct or employee agreement that references security obligations. If you have evidence of a performance review that included security metrics, that strengthens the story.',
  },

  // ─────────────────────────────────────────────
  // CC2 — Communication & Information
  // ─────────────────────────────────────────────
  {
    framework: 'soc2',
    criteriaId: 'CC2.1',
    title: 'Internal Security Communication',
    description:
      'The entity internally communicates information, including objectives and responsibilities for security, necessary to support the functioning of internal controls.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see that employees know what the security policies are and what is expected of them. They look for evidence that security policies, updates, and expectations are actively communicated, not just posted somewhere no one reads.',
    evidenceGuidance:
      'Provide screenshots of internal security policy announcements (Slack messages, email newsletters, company all-hands slides). Upload your security policy document and show evidence employees acknowledged it (e.g., DocuSign records, Google Form responses, training platform confirmations). Include any security-specific onboarding materials sent to new hires.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC2.2',
    title: 'Internal Communication Channels',
    description:
      'The entity internally communicates information about the functioning of internal controls through established communication channels, including reporting mechanisms for security issues.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to know how employees report security concerns. They look for clear, accessible channels such as a dedicated Slack channel, email alias, ticketing system, or anonymous reporting mechanism.',
    evidenceGuidance:
      'Screenshot your #security or #incidents Slack channel showing it exists and is used. Provide your security incident reporting procedure document. If you have a security@company.com alias or a ticketing queue for security issues, show the configuration. Include any whistleblower or anonymous reporting policy if applicable.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC2.3',
    title: 'External Security Communication',
    description:
      'The entity communicates with external parties regarding matters affecting the functioning of internal controls, including security commitments, breach notifications, and third-party requirements.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see how you communicate security commitments to customers and partners, and how you would notify external parties of a breach. They look for published security pages, contractual security terms, and breach notification procedures.',
    evidenceGuidance:
      'Provide your public-facing security page URL or screenshot. Upload your Terms of Service and Privacy Policy highlighting security commitments. Include your breach notification procedure document with timelines. If you have a security@ contact email or a security.txt file, show those. Customer-facing SLAs with security language are also relevant.',
  },

  // ─────────────────────────────────────────────
  // CC3 — Risk Assessment
  // ─────────────────────────────────────────────
  {
    framework: 'soc2',
    criteriaId: 'CC3.1',
    title: 'Risk Assessment Objectives',
    description:
      'The entity specifies objectives with sufficient clarity to enable the identification and assessment of risks relating to those objectives, including security-specific objectives.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see that you have defined what you are trying to protect and why. They look for documented security objectives that tie back to the business, not vague statements but specific goals like "protect customer data at rest and in transit" or "maintain 99.9% uptime."',
    evidenceGuidance:
      'Upload your information security policy with its stated objectives. Provide your risk assessment document showing the scope of what you assessed and why. If you have a security program charter or annual security plan with objectives, include that. Even a simple document listing your top security goals with rationale is helpful.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC3.2',
    title: 'Risk Identification and Analysis',
    description:
      'The entity identifies risks to the achievement of its objectives across the entity and analyzes risks as a basis for determining how the risks should be managed.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want your risk register. They want to see that you have systematically identified threats (data breach, insider threat, ransomware, vendor failure, etc.), assessed their likelihood and impact, and decided how to address each one (mitigate, accept, transfer, or avoid).',
    evidenceGuidance:
      'Upload your risk register or risk assessment spreadsheet showing identified risks, their likelihood, impact, and treatment decisions. Include the date of the most recent risk assessment (it should be within the last 12 months). If you used a framework or tool (e.g., NIST, a GRC platform), mention it. Meeting notes from the risk review session add credibility.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC3.3',
    title: 'Fraud Risk Assessment',
    description:
      'The entity considers the potential for fraud in assessing risks to the achievement of objectives, including unauthorized access, data manipulation, and management override of controls.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see that you thought about insider threats and fraud scenarios, not just external attacks. They look for consideration of employees or admins abusing their access, falsifying data, or bypassing controls.',
    evidenceGuidance:
      'Include a section in your risk assessment that explicitly addresses fraud risks: insider threats, privilege abuse, data manipulation, and segregation-of-duties concerns. Document how you prevent a single person from having unchecked access (e.g., requiring PR reviews, admin action logging, dual approvals for sensitive operations). Background check policies for employees with elevated access are also relevant.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC3.4',
    title: 'Change Impact on Controls',
    description:
      'The entity identifies and assesses changes that could significantly impact the system of internal controls, including infrastructure changes, new products, and organizational restructuring.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see that when something big changes (new cloud provider, acquisition, major product launch, team restructuring), you evaluate whether existing security controls still work. They do not want to find that you migrated to a new database without reassessing access controls.',
    evidenceGuidance:
      'Provide examples of change assessments: when you adopted a new service, migrated infrastructure, or restructured teams, show how you evaluated security impact. Include your change management policy referencing security review requirements. Architecture decision records (ADRs) or RFC documents that include a security considerations section work well.',
  },

  // ─────────────────────────────────────────────
  // CC4 — Monitoring Activities
  // ─────────────────────────────────────────────
  {
    framework: 'soc2',
    criteriaId: 'CC4.1',
    title: 'Ongoing Monitoring of Controls',
    description:
      'The entity selects, develops, and performs ongoing and/or separate evaluations to ascertain whether the components of internal controls are present and functioning.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see that you do not just set up controls and forget about them. They look for ongoing monitoring: regular reviews of access lists, automated alerts for policy violations, periodic security assessments, and dashboards that track control effectiveness.',
    evidenceGuidance:
      'Provide screenshots of your monitoring dashboards (e.g., AWS GuardDuty, Datadog Security Monitoring, SIEM alerts). Include records of periodic access reviews (quarterly user access review spreadsheets). Upload any internal audit or self-assessment reports. Show automated alerts configured for control failures (e.g., alerts when MFA is disabled, when an admin role is granted).',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC4.2',
    title: 'Internal Control Deficiency Communication',
    description:
      'The entity evaluates and communicates internal control deficiencies in a timely manner to those parties responsible for taking corrective action, including management.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see that when you discover a security gap or control failure, it gets reported to the right people and fixed. They look for a process: how deficiencies are identified, who gets notified, how they are tracked, and evidence they were remediated.',
    evidenceGuidance:
      'Provide examples of identified control deficiencies and their resolution (redacted if needed). Upload your deficiency tracking log or tickets showing issues found, assigned owners, and closure dates. Include any management reports summarizing control effectiveness. If a penetration test or vulnerability scan found issues, show the findings and the remediation tracking.',
  },

  // ─────────────────────────────────────────────
  // CC5 — Control Activities
  // ─────────────────────────────────────────────
  {
    framework: 'soc2',
    criteriaId: 'CC5.1',
    title: 'Control Activities Selection',
    description:
      'The entity selects and develops control activities that contribute to the mitigation of risks to the achievement of objectives to acceptable levels.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see that for each significant risk you identified, there is a corresponding control that addresses it. They want a clear mapping: "We identified X risk, so we implemented Y control." Controls should not be random but tied to actual risks.',
    evidenceGuidance:
      'Provide a risk-to-control mapping document or matrix. This can be a spreadsheet with columns for Risk, Control, Control Owner, and Evidence. For example: Risk = "Unauthorized access to production," Control = "MFA required for all production access," Evidence = "IAM policy screenshot." Your risk register with linked controls serves this purpose.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC5.2',
    title: 'Technology General Controls',
    description:
      'The entity selects and develops general control activities over technology to support the achievement of objectives, including IT infrastructure, security tooling, and automated controls.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see your technology-level controls: how you manage infrastructure access, how you secure your CI/CD pipeline, how you handle secrets management, and what automated security tools you use. They want to know the technology stack is itself secured.',
    evidenceGuidance:
      'Document your infrastructure security controls: how secrets are managed (e.g., environment variables in Fly.io, AWS Secrets Manager), how deployments are secured (e.g., CI/CD pipeline requires PR approval), how infrastructure access is restricted (e.g., SSH keys, VPN). Screenshots of your CI/CD pipeline configuration showing required checks, your secrets management setup, and your infrastructure-as-code security settings are all valuable.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC5.3',
    title: 'Security Policies and Procedures',
    description:
      'The entity deploys control activities through policies that establish what is expected and procedures that put policies into action, covering the full scope of security operations.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see documented policies and evidence those policies are actually followed. A policy without evidence of implementation is a finding. They expect policies covering: information security, acceptable use, access control, incident response, change management, and data classification at minimum.',
    evidenceGuidance:
      'Upload your complete set of security policies. At minimum include: Information Security Policy, Acceptable Use Policy, Access Control Policy, Incident Response Plan, Change Management Policy, and Data Classification Policy. For each policy, show evidence it is enforced (e.g., training records showing employees read the policy, configuration screenshots showing the policy is implemented technically). Policies should have version numbers, approval dates, and owners.',
  },

  // ─────────────────────────────────────────────
  // CC6 — Logical & Physical Access
  // ─────────────────────────────────────────────
  {
    framework: 'soc2',
    criteriaId: 'CC6.1',
    title: 'Logical Access Security',
    description:
      'The entity implements logical access security software, infrastructure, and architectures over protected information assets to protect them from unauthorized access.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see your authentication and authorization architecture. How do users log in? Is MFA enforced? How are API keys managed? What identity provider do you use? They want the full picture of how you prevent unauthorized access to systems and data.',
    evidenceGuidance:
      'Provide an architecture diagram showing your authentication flow. Screenshot your identity provider (e.g., Google Workspace, Okta, Auth0) showing MFA is enforced for all users. Show your password policy configuration. Document how API keys and service accounts are managed. If you use SSO, show its configuration. Include screenshots of role-based access control (RBAC) settings in your major systems (cloud provider, database, application).',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC6.2',
    title: 'Access Provisioning',
    description:
      'Prior to issuing system credentials and granting system access, the entity registers and authorizes new internal and external users whose access is administered by the entity.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see a formal process for granting access. When a new employee joins or someone needs access to a new system, there should be a request, approval, and record. They do not want to see ad-hoc "just give them access" without any trail.',
    evidenceGuidance:
      'Document your access provisioning process: how new employees get accounts (e.g., IT onboarding checklist), who approves access requests, and where approvals are recorded. Provide sample access request tickets or approval emails. Show your onboarding checklist that includes access setup. If you use an identity provider with automated provisioning (e.g., SCIM), show that configuration.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC6.3',
    title: 'Access Removal',
    description:
      'The entity removes access to protected information assets when a user no longer requires access, including upon termination, role change, or project completion.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see a reliable offboarding process. When someone leaves the company or changes roles, their access is revoked promptly. They will check for stale accounts and look at the time between termination and access removal.',
    evidenceGuidance:
      'Upload your offboarding checklist showing all systems where access is revoked. Provide examples of completed offboarding (redacted) showing accounts were disabled within 24 hours of departure. Screenshot your identity provider showing disabled accounts for former employees. If you have automated deprovisioning, show the configuration. Include your policy stating the required timeline for access removal.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC6.4',
    title: 'Physical Access Restrictions',
    description:
      'The entity restricts physical access to facilities and protected information assets to authorized personnel only.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to know how physical access to offices, server rooms, or data centers is controlled. For cloud-native companies, this is mostly about your cloud provider (AWS, GCP, Azure) handling physical security, plus your office security.',
    evidenceGuidance:
      'If you are fully cloud-hosted, provide your cloud provider SOC 2 report or a link to their compliance page (e.g., AWS Artifact). For your office, describe physical security measures: badge access, visitor logs, locked server rooms. If you are fully remote with no office, document that and explain where any physical assets (laptops) are secured. Include your clean desk policy if applicable.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC6.5',
    title: 'Logical Access Restrictions',
    description:
      'The entity discontinues logical and physical protections over physical assets only after the ability to read or recover data from those assets has been diminished.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see that when hardware is retired or returned, data is wiped before the device is decommissioned. For cloud environments, they want to see how you ensure data is destroyed when you stop using a service or storage volume.',
    evidenceGuidance:
      'Document your data destruction policy for retired hardware (laptops, hard drives). If you use a cloud provider, reference their data deletion practices from their compliance documentation. For company laptops, show your MDM (mobile device management) configuration that enables remote wipe. Include your asset inventory showing device lifecycle status. For cloud storage, show how you delete data when decommissioning services.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC6.6',
    title: 'System Boundary Protection',
    description:
      'The entity implements logical access security measures to protect against threats from sources outside its system boundaries, including firewalls, WAFs, and network segmentation.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see how you protect the perimeter of your system. What sits between the internet and your application? They look for firewalls, WAFs, DDoS protection, network segmentation, and restricted ingress points.',
    evidenceGuidance:
      'Provide a network architecture diagram showing your system boundaries. Screenshot your firewall rules or security group configurations. Show your WAF (Web Application Firewall) setup if applicable. Document DDoS protection (e.g., Cloudflare, AWS Shield). Show that only necessary ports are open. If you use a CDN, show its security configuration. Include any VPN or private network configuration for internal services.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC6.7',
    title: 'Data Transmission Protection',
    description:
      'The entity restricts the transmission, movement, and removal of information to authorized internal and external users and processes, and protects it during transmission.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see that data is encrypted in transit. They look for TLS/HTTPS everywhere, encrypted database connections, and controls over data exports or transfers. They want proof that sensitive data cannot be intercepted in transit.',
    evidenceGuidance:
      'Show your TLS certificate configuration (SSL Labs test result is great). Screenshot your application enforcing HTTPS (redirect from HTTP to HTTPS). Document encrypted connections to your database (e.g., require_ssl in connection string). Show your HSTS headers configuration. If you transfer data between services, document how those connections are encrypted. Include any data transfer policies restricting how data can be exported or shared.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC6.8',
    title: 'Malicious Software Prevention',
    description:
      'The entity implements controls to prevent or detect and act upon the introduction of unauthorized or malicious software, including endpoint protection and code scanning.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see how you prevent malware and malicious code from entering your systems. They look for endpoint protection on company devices, dependency scanning in your CI/CD pipeline, and controls over what software can be installed.',
    evidenceGuidance:
      'Show your endpoint protection solution (e.g., CrowdStrike, SentinelOne, built-in OS protection) deployed across company devices. Provide screenshots of your dependency vulnerability scanning in CI/CD (e.g., Dependabot, Snyk, npm audit). Document your policy on approved software and how you manage software installations on company devices. If you use container scanning, show that configuration. Include any code review requirements that help catch malicious code.',
  },

  // ─────────────────────────────────────────────
  // CC7 — System Operations
  // ─────────────────────────────────────────────
  {
    framework: 'soc2',
    criteriaId: 'CC7.1',
    title: 'Infrastructure Monitoring',
    description:
      'The entity uses detection and monitoring procedures to identify changes to configurations that result in the introduction of new vulnerabilities, and susceptibilities to newly discovered vulnerabilities.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see that you actively monitor your infrastructure for security issues. They look for vulnerability scanning, configuration monitoring, and alerting on suspicious changes. They want to know you would notice if something went wrong.',
    evidenceGuidance:
      'Provide screenshots of your monitoring setup: infrastructure monitoring dashboards (Datadog, Grafana, CloudWatch), vulnerability scanning reports (Qualys, Nessus, AWS Inspector), and configuration drift detection. Show alert configurations for security-relevant events. Include your vulnerability scanning schedule (it should be at least quarterly, ideally continuous). Document how scan results are reviewed and acted upon.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC7.2',
    title: 'Anomaly Detection',
    description:
      'The entity monitors system components and the operation of those components for anomalies that are indicative of malicious acts, natural disasters, and errors affecting the entity\'s ability to meet its objectives.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see that you can detect unusual activity: unexpected login locations, abnormal data access patterns, sudden traffic spikes, or after-hours administrative actions. They want proactive detection, not just waiting for someone to report a problem.',
    evidenceGuidance:
      'Show your anomaly detection or SIEM setup (e.g., CloudTrail + CloudWatch Alarms, Datadog Security Monitoring, Splunk). Provide examples of alert rules configured to detect anomalies (e.g., login from new country, admin action outside business hours, unusual API call volume). Include evidence of alerts being investigated (sample alert and response). Document your log aggregation setup showing that relevant logs are collected centrally.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC7.3',
    title: 'Security Incident Evaluation',
    description:
      'The entity evaluates security events to determine whether they constitute security incidents, including defining criteria for incident classification and severity levels.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see that you have a defined process for triaging security events. Not every alert is an incident, so they look for classification criteria: what makes something a P1 vs. a P3, who decides, and how the decision is documented.',
    evidenceGuidance:
      'Upload your incident classification matrix showing severity levels (e.g., P1-Critical through P4-Low) with definitions and examples for each level. Provide your incident response plan section covering triage procedures. Show sample triage records where an alert was evaluated and classified. Include your escalation criteria defining when an event becomes an incident.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC7.4',
    title: 'Incident Response Execution',
    description:
      'The entity responds to identified security incidents by executing a defined incident response program, including containment, eradication, and stakeholder communication.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want a documented incident response plan and evidence it works. They look for defined roles (incident commander, communicator), clear procedures (contain, investigate, eradicate, recover), communication templates, and evidence the plan has been tested.',
    evidenceGuidance:
      'Upload your full Incident Response Plan including roles, communication procedures, containment steps, and recovery steps. Provide evidence of tabletop exercises or incident response drills (meeting notes, after-action reports). If you have had real incidents, provide post-incident reports (redacted as needed) showing the plan was followed. Include contact escalation lists and communication templates.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC7.5',
    title: 'Incident Recovery',
    description:
      'The entity identifies, develops, and implements activities to recover from identified security incidents and restore systems to normal operations.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see that after an incident, you can recover and learn from it. They look for recovery procedures, post-incident reviews, root cause analysis, and evidence that findings drive improvements to prevent recurrence.',
    evidenceGuidance:
      'Provide your recovery procedures for common incident types (e.g., compromised credentials, data exposure, service outage). Upload post-incident review (postmortem) templates and any completed postmortems (redacted if needed). Show how action items from postmortems are tracked to completion. Include your lessons-learned process and evidence that past incidents led to control improvements.',
  },

  // ─────────────────────────────────────────────
  // CC8 — Change Management
  // ─────────────────────────────────────────────
  {
    framework: 'soc2',
    criteriaId: 'CC8.1',
    title: 'Change Authorization and Approval',
    description:
      'The entity authorizes, designs, develops, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures to meet its objectives.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see a controlled change management process. Every code or infrastructure change should be reviewed, tested, and approved before reaching production. They look for pull request reviews, CI/CD pipelines with required checks, and separation between development and production environments.',
    evidenceGuidance:
      'Screenshot your GitHub/GitLab branch protection rules showing required reviews and status checks before merging. Provide your CI/CD pipeline configuration showing automated tests run before deployment. Show examples of merged pull requests with reviewer approvals. Document your change management policy including emergency change procedures. If you use infrastructure-as-code, show the review process for infrastructure changes. Include evidence of separate dev/staging/production environments.',
  },

  // ─────────────────────────────────────────────
  // CC9 — Risk Mitigation
  // ─────────────────────────────────────────────
  {
    framework: 'soc2',
    criteriaId: 'CC9.1',
    title: 'Risk Mitigation Activities',
    description:
      'The entity identifies, selects, and develops risk mitigation activities for risks arising from potential business disruptions, including technology failures, natural disasters, and supply chain issues.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see that you have a business continuity plan. If your primary region goes down, your database crashes, or a key employee leaves, how do you keep operating? They look for documented continuity plans and evidence you have thought through failure scenarios.',
    evidenceGuidance:
      'Upload your Business Continuity Plan (BCP) or Disaster Recovery Plan (DRP). Document your architecture redundancy (multi-AZ, database replicas, automated failover). Show your RTO (Recovery Time Objective) and RPO (Recovery Point Objective) targets and how your architecture meets them. Include key-person risk mitigation (cross-training, documentation). If you have tested your DR plan, provide the test results.',
  },
  {
    framework: 'soc2',
    criteriaId: 'CC9.2',
    title: 'Vendor Risk Management',
    description:
      'The entity assesses and manages risks associated with vendors and business partners who have access to the entity\'s systems or data, including cloud service providers and SaaS tools.',
    category: 'security',
    whatAuditorsWant:
      'Auditors want to see that you evaluate the security of your vendors, especially those with access to customer data. They look for vendor assessments, security reviews before onboarding new vendors, and ongoing monitoring of critical vendors.',
    evidenceGuidance:
      'Provide your vendor inventory listing all third-party services with access to data, their purpose, and what data they can access. Upload vendor security assessments or questionnaire responses for critical vendors. Show SOC 2 reports or security certifications you have collected from key vendors (e.g., your cloud provider, database host, email service). Include your vendor management policy describing how vendors are evaluated, approved, and monitored. Document contractual security requirements (DPAs, security addenda) with critical vendors.',
  },

  // ─────────────────────────────────────────────
  // A1 — Availability
  // ─────────────────────────────────────────────
  {
    framework: 'soc2',
    criteriaId: 'A1.1',
    title: 'System Availability Commitments',
    description:
      'The entity maintains, monitors, and evaluates current processing capacity and use of system components to manage capacity demand and to enable the implementation of additional capacity to meet its availability commitments.',
    category: 'availability',
    whatAuditorsWant:
      'Auditors want to see your uptime commitments and how you monitor and maintain them. They look for SLAs, uptime monitoring, capacity planning, and auto-scaling configurations. They want to know you can handle your current load and plan for growth.',
    evidenceGuidance:
      'Provide your SLA or uptime commitment documentation. Show your uptime monitoring setup (e.g., Pingdom, UptimeRobot, Datadog Synthetics) with historical uptime data. Document your auto-scaling configuration or capacity planning process. Include status page configuration showing public availability reporting. Show alerts configured for capacity thresholds (CPU, memory, disk, connections).',
  },
  {
    framework: 'soc2',
    criteriaId: 'A1.2',
    title: 'Recovery Objectives and Planning',
    description:
      'The entity authorizes, designs, develops, implements, operates, approves, maintains, and monitors environmental protections, software, data backup, and recovery infrastructure to meet its availability objectives.',
    category: 'availability',
    whatAuditorsWant:
      'Auditors want to see defined RTO and RPO values and infrastructure that can actually meet them. They look for automated backups, backup retention policies, multi-region or multi-AZ deployment, and documented recovery procedures.',
    evidenceGuidance:
      'Document your RTO and RPO targets. Show your backup configuration (e.g., database backup schedule, retention period, backup encryption). Provide your infrastructure diagram showing redundancy (multi-AZ, replicas, failover). Upload your disaster recovery runbook with step-by-step recovery procedures. Include your backup monitoring setup showing alerts for backup failures.',
  },
  {
    framework: 'soc2',
    criteriaId: 'A1.3',
    title: 'Backup and Recovery Testing',
    description:
      'The entity tests recovery plan procedures supporting system recovery to meet its availability objectives, including periodic restoration tests and failover drills.',
    category: 'availability',
    whatAuditorsWant:
      'Auditors want proof that your backups actually work. A backup that has never been tested is not a backup. They look for documented recovery tests, test results showing successful data restoration, and a regular testing schedule.',
    evidenceGuidance:
      'Provide records of backup restoration tests showing date, scope, result, and time to restore. Include your backup testing schedule (should be at least annually, quarterly is better). Document any failover drills performed and their results. Show that recovery met your RTO/RPO targets during testing. If a test failed, show what was fixed afterward.',
  },

  // ─────────────────────────────────────────────
  // PI1 — Processing Integrity
  // ─────────────────────────────────────────────
  {
    framework: 'soc2',
    criteriaId: 'PI1.1',
    title: 'Processing Accuracy and Completeness',
    description:
      'The entity implements policies and procedures over system processing to ensure that processing is complete, valid, accurate, timely, and authorized to meet the entity\'s objectives.',
    category: 'processing_integrity',
    whatAuditorsWant:
      'Auditors want to see that your system processes data correctly. They look for input validation, data integrity checks, reconciliation processes, and quality assurance procedures that ensure data going in and coming out is accurate.',
    evidenceGuidance:
      'Document your input validation rules (e.g., schema validation, type checking, boundary validation). Show automated data quality checks in your pipeline. Provide examples of reconciliation processes (e.g., comparing record counts between systems). Include your QA testing process for data processing features. Show database constraints that enforce data integrity.',
  },
  {
    framework: 'soc2',
    criteriaId: 'PI1.2',
    title: 'Processing Output Monitoring',
    description:
      'The entity implements policies and procedures to ensure that system processing outputs are complete, valid, and accurate, including output validation and exception handling.',
    category: 'processing_integrity',
    whatAuditorsWant:
      'Auditors want to see that you verify outputs, not just inputs. They look for output validation, monitoring for unexpected results, and processes to catch and correct processing errors before they reach customers.',
    evidenceGuidance:
      'Show your output validation checks (e.g., reports verified before delivery, API response validation). Provide monitoring dashboards tracking processing metrics (error rates, processing times, output volumes). Document alerting rules for anomalous outputs. Include examples of output reconciliation or spot-check procedures.',
  },
  {
    framework: 'soc2',
    criteriaId: 'PI1.3',
    title: 'Processing Error Handling',
    description:
      'The entity implements policies and procedures to identify, report, and correct processing errors in a timely manner to meet its objectives.',
    category: 'processing_integrity',
    whatAuditorsWant:
      'Auditors want to see a defined process for handling errors. When processing fails or produces incorrect results, how is it detected, reported, and corrected? They want error handling that is systematic, not ad-hoc.',
    evidenceGuidance:
      'Document your error handling and retry procedures. Show your error tracking system (e.g., Sentry, Bugsnag) with alerts configured. Provide your error escalation process. Include examples of processing errors that were detected and corrected. Show dead letter queues or error queues if applicable. Document SLAs for error resolution.',
  },
  {
    framework: 'soc2',
    criteriaId: 'PI1.4',
    title: 'Processing Input Validation',
    description:
      'The entity implements policies and procedures to ensure that inputs are validated and processed accurately and completely, including authorization of data sources.',
    category: 'processing_integrity',
    whatAuditorsWant:
      'Auditors want to see that you validate data at the point of entry. They look for input sanitization, schema validation, authorization checks on data sources, and rejection of malformed or unauthorized inputs.',
    evidenceGuidance:
      'Show your input validation code or configuration (e.g., Zod schemas, JSON Schema validation, API request validation middleware). Document how you authenticate and authorize data sources. Provide examples of rejected invalid inputs and how they are handled. Include any API documentation showing required fields and validation rules.',
  },
  {
    framework: 'soc2',
    criteriaId: 'PI1.5',
    title: 'Storage Completeness and Accuracy',
    description:
      'The entity implements policies and procedures to store data completely and accurately for its intended purpose, including data retention, archival, and deletion.',
    category: 'processing_integrity',
    whatAuditorsWant:
      'Auditors want to see that stored data maintains its integrity over time. They look for data retention policies, storage integrity checks, and processes to ensure data is not silently lost or corrupted.',
    evidenceGuidance:
      'Provide your data retention policy defining how long different data types are kept. Show database integrity features in use (checksums, constraints, foreign keys). Document your data archival and deletion procedures. Include monitoring for storage health (disk usage, replication lag, backup integrity). Show your data lifecycle management configuration.',
  },

  // ─────────────────────────────────────────────
  // C1 — Confidentiality
  // ─────────────────────────────────────────────
  {
    framework: 'soc2',
    criteriaId: 'C1.1',
    title: 'Confidential Information Identification',
    description:
      'The entity identifies and maintains confidential information to meet the entity\'s objectives related to confidentiality, including data classification and labeling.',
    category: 'confidentiality',
    whatAuditorsWant:
      'Auditors want to see that you know what data is confidential and have classified it accordingly. They look for a data classification scheme (e.g., Public, Internal, Confidential, Restricted) and evidence it is applied to actual data assets.',
    evidenceGuidance:
      'Upload your data classification policy defining your classification levels with examples. Provide your data inventory or data map showing what confidential data you hold, where it lives, and who can access it. Show how classification is applied in practice (e.g., labeled repositories, tagged database columns, classified document folders). Include any data flow diagrams showing how confidential data moves through your systems.',
  },
  {
    framework: 'soc2',
    criteriaId: 'C1.2',
    title: 'Confidential Information Disposal',
    description:
      'The entity disposes of confidential information to meet the entity\'s objectives related to confidentiality, using secure deletion methods appropriate to the data sensitivity.',
    category: 'confidentiality',
    whatAuditorsWant:
      'Auditors want to see that when confidential data is no longer needed, it is securely destroyed, not just deleted. They look for secure deletion procedures, data retention enforcement, and proof that expired data is actually removed.',
    evidenceGuidance:
      'Document your data disposal procedures for different data types and media. Show evidence of data purging in accordance with your retention policy (e.g., automated cleanup scripts, database purge logs). Include secure deletion methods used (cryptographic erasure, secure wipe for physical media). Provide records of completed data disposal activities. Show your retention policy enforcement mechanism (automated vs. manual).',
  },

  // ─────────────────────────────────────────────
  // P1–P8 — Privacy
  // ─────────────────────────────────────────────
  {
    framework: 'soc2',
    criteriaId: 'P1.1',
    title: 'Privacy Notice and Consent',
    description:
      'The entity provides notice to data subjects about its privacy practices, including the types of personal information collected, how it is used, and with whom it is shared, and obtains consent where required.',
    category: 'privacy',
    whatAuditorsWant:
      'Auditors want to see a clear, accessible privacy notice and evidence that users are informed before data collection begins. They look for your privacy policy, cookie consent mechanisms, and consent records.',
    evidenceGuidance:
      'Provide your published Privacy Policy URL and a screenshot showing it is accessible from your website. Show your cookie consent banner implementation. Include your consent collection mechanism (e.g., checkboxes at signup, cookie consent platform). Document how consent records are stored and can be retrieved. If you operate in GDPR jurisdictions, show your lawful basis documentation.',
  },
  {
    framework: 'soc2',
    criteriaId: 'P2.1',
    title: 'Choice and Consent Management',
    description:
      'The entity communicates choices available to data subjects regarding the collection, use, retention, disclosure, and disposal of personal information, and obtains consent for new uses or disclosures.',
    category: 'privacy',
    whatAuditorsWant:
      'Auditors want to see that users can control their data preferences. They look for opt-out mechanisms, preference centers, and processes for obtaining new consent when data use changes.',
    evidenceGuidance:
      'Show your preference center or settings page where users can manage their data choices. Provide your opt-out/unsubscribe mechanism for marketing communications. Document your process for notifying users and re-obtaining consent when you change how you use their data. Include email or in-app notification templates used for privacy updates.',
  },
  {
    framework: 'soc2',
    criteriaId: 'P3.1',
    title: 'Personal Information Collection',
    description:
      'The entity collects personal information only for the purposes identified in the privacy notice and limits collection to what is necessary for those purposes.',
    category: 'privacy',
    whatAuditorsWant:
      'Auditors want to see data minimization in practice. They look for evidence that you only collect what you need and that your actual data collection matches what your privacy policy says.',
    evidenceGuidance:
      'Provide a mapping of personal data fields collected at each touchpoint (signup form, payment, etc.) matched to the stated purpose in your privacy policy. Show that your signup form collects only necessary fields. Document any data you explicitly chose not to collect and why. Include your data minimization guidelines for developers building new features.',
  },
  {
    framework: 'soc2',
    criteriaId: 'P4.1',
    title: 'Personal Information Use and Retention',
    description:
      'The entity limits the use of personal information to the purposes identified in the privacy notice, and retains personal information for only as long as needed to fulfill those purposes.',
    category: 'privacy',
    whatAuditorsWant:
      'Auditors want to see that personal data is used only for stated purposes and deleted when no longer needed. They look for a data retention schedule, automated purging, and controls preventing data from being used for unauthorized purposes.',
    evidenceGuidance:
      'Provide your data retention schedule listing each data type, its retention period, and deletion method. Show automated data purging configurations or scripts. Document access controls that limit who can use personal data for what purpose. Include evidence of completed data purges per your retention schedule.',
  },
  {
    framework: 'soc2',
    criteriaId: 'P5.1',
    title: 'Personal Information Access',
    description:
      'The entity grants identified and authenticated data subjects the ability to access their stored personal information for review and, upon request, provides physical or electronic copies of that information.',
    category: 'privacy',
    whatAuditorsWant:
      'Auditors want to see that users can access their own data. They look for self-service data export features, a documented process for handling data access requests, and evidence that requests are fulfilled within required timeframes.',
    evidenceGuidance:
      'Show your data export or download feature in the application (if available). Document your process for handling data subject access requests (DSARs) including who handles them, the response timeline, and the format of data provided. Provide a sample response template (redacted). Include your tracking mechanism for DSAR requests and completion status.',
  },
  {
    framework: 'soc2',
    criteriaId: 'P6.1',
    title: 'Personal Information Disclosure',
    description:
      'The entity discloses personal information to third parties only for the purposes identified in the privacy notice and with the explicit consent of the data subject.',
    category: 'privacy',
    whatAuditorsWant:
      'Auditors want to see that you control who gets access to personal data and that disclosures are authorized. They look for third-party data sharing agreements, data processing agreements, and a list of all parties you share personal data with.',
    evidenceGuidance:
      'Provide your list of third parties receiving personal data with the purpose for each. Upload Data Processing Agreements (DPAs) with key vendors. Document your process for evaluating and approving new data sharing arrangements. Show that your privacy policy accurately lists third-party data sharing. Include any data transfer mechanisms for cross-border transfers (SCCs, adequacy decisions).',
  },
  {
    framework: 'soc2',
    criteriaId: 'P7.1',
    title: 'Personal Information Quality',
    description:
      'The entity collects and maintains accurate, up-to-date, complete, and relevant personal information for the purposes identified in the privacy notice.',
    category: 'privacy',
    whatAuditorsWant:
      'Auditors want to see that you keep personal data accurate and allow users to correct errors. They look for data quality processes, user self-service profile editing, and procedures for handling correction requests.',
    evidenceGuidance:
      'Show your user profile editing page where users can update their information. Document your process for handling data correction requests. Include any data quality validation at the point of collection (e.g., email verification, address validation). Show how you handle bounced emails or outdated contact information.',
  },
  {
    framework: 'soc2',
    criteriaId: 'P8.1',
    title: 'Privacy Complaint Management',
    description:
      'The entity implements a process for receiving, addressing, resolving, and communicating the resolution of inquiries, complaints, and disputes from data subjects regarding their personal information.',
    category: 'privacy',
    whatAuditorsWant:
      'Auditors want to see that users can complain about privacy issues and that complaints are handled. They look for a documented complaint process, a contact method for privacy concerns, and tracking of complaint resolution.',
    evidenceGuidance:
      'Provide your privacy complaint handling procedure. Show the privacy contact information published on your website (e.g., privacy@company.com, privacy page with contact form). Document how complaints are tracked, escalated, and resolved. Include your response timeline commitments. Show any completed complaint resolutions as examples (redacted). If you have a Data Protection Officer (DPO), document their contact information and role.',
  },
];
