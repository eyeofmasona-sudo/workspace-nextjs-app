export type IntegrationMode = 'native-library' | 'managed-service' | 'skill-pack' | 'reference-catalog' | 'remote-only';
export type IntegrationCategory = 'agents' | 'automation' | 'browser' | 'design' | 'media' | 'search' | 'developer-tools' | 'deployment' | 'api-catalog';

export interface JarvisIntegration {
  id: string;
  name: string;
  repository: string;
  category: IntegrationCategory;
  mode: IntegrationMode;
  enabledByDefault: boolean;
  installTarget?: string;
  localEndpoint?: string;
  requires: string[];
  conflictsWith?: string[];
  notes: string;
}

/**
 * Canonical, deduplicated integration registry.
 * JARVIS remains the top-level orchestrator. External agent platforms are
 * exposed through adapters instead of being allowed to own scheduling,
 * persistence, approvals, or model routing.
 */
export const JARVIS_INTEGRATIONS: JarvisIntegration[] = [
  { id: 'agent-reach', name: 'Agent Reach', repository: 'https://github.com/Panniantong/Agent-Reach', category: 'agents', mode: 'skill-pack', enabledByDefault: false, installTarget: 'D:/JARVIS/integrations/agent-reach', requires: ['git', 'python'], notes: 'Import selected reach/connectivity skills; do not replace the JARVIS orchestrator.' },
  { id: 'agency-agents', name: 'Agency Agents', repository: 'https://github.com/msitarzewski/agency-agents', category: 'agents', mode: 'skill-pack', enabledByDefault: true, installTarget: 'D:/JARVIS/integrations/agency-agents', requires: ['git'], notes: 'Agent role and prompt library. Import profiles into the existing agent registry.' },
  { id: 'semantic-kernel', name: 'Semantic Kernel', repository: 'https://github.com/microsoft/semantic-kernel', category: 'agents', mode: 'native-library', enabledByDefault: false, requires: ['dotnet-or-python'], conflictsWith: ['openmanus', 'openhands', 'buildingai'], notes: 'Use only selected planners/connectors behind a JARVIS adapter.' },
  { id: 'superpowers', name: 'Superpowers', repository: 'https://github.com/obra/superpowers', category: 'developer-tools', mode: 'skill-pack', enabledByDefault: true, installTarget: 'D:/JARVIS/integrations/superpowers', requires: ['git'], notes: 'Import reusable development workflows and quality gates.' },
  { id: 'openmontage', name: 'OpenMontage', repository: 'https://github.com/calesthio/OpenMontage', category: 'media', mode: 'managed-service', enabledByDefault: false, installTarget: 'D:/JARVIS/services/openmontage', requires: ['git', 'python', 'ffmpeg'], notes: 'Run as an isolated media service; route generation models through JARVIS.' },
  { id: 'openhands', name: 'OpenHands', repository: 'https://github.com/OpenHands/OpenHands', category: 'developer-tools', mode: 'managed-service', enabledByDefault: false, installTarget: 'D:/JARVIS/services/openhands', localEndpoint: 'http://127.0.0.1:3001', requires: ['docker-or-wsl2', 'git'], conflictsWith: ['openmanus', 'buildingai'], notes: 'Optional coding worker. JARVIS owns approvals, filesystem scope, and task lifecycle.' },
  { id: 'openmanus', name: 'OpenManus', repository: 'https://github.com/mannaandpoem/OpenManus', category: 'agents', mode: 'managed-service', enabledByDefault: false, installTarget: 'D:/JARVIS/services/openmanus', requires: ['python', 'git'], conflictsWith: ['openhands', 'semantic-kernel', 'buildingai'], notes: 'Experimental worker only; disabled until sandbox and provider adapters pass tests.' },
  { id: 'buildingai', name: 'BuildingAI', repository: 'https://github.com/BidingCC/BuildingAI', category: 'agents', mode: 'remote-only', enabledByDefault: false, localEndpoint: 'http://127.0.0.1:4090', requires: ['docker', '4gb-ram', '5gb-storage'], conflictsWith: ['openhands', 'openmanus', 'semantic-kernel'], notes: 'Large overlapping platform. Connect through MCP/API rather than embedding its UI or database.' },
  { id: 'open-design', name: 'Open Design', repository: 'https://github.com/An-Open-Design/Open-Design', category: 'design', mode: 'remote-only', enabledByDefault: false, requires: [], notes: 'Repository currently requires manual verification before installation.' },
  { id: 'perplexica', name: 'Perplexica', repository: 'https://github.com/ItzCrazyKns/Perplexica', category: 'search', mode: 'managed-service', enabledByDefault: false, installTarget: 'D:/JARVIS/services/perplexica', localEndpoint: 'http://127.0.0.1:3002', requires: ['docker-or-node', 'git'], notes: 'Expose search as a tool; use JARVIS model routing and credentials.' },
  { id: 'liveportrait', name: 'LivePortrait', repository: 'https://github.com/KwaiVGI/LivePortrait', category: 'media', mode: 'managed-service', enabledByDefault: false, installTarget: 'D:/JARVIS/services/liveportrait', requires: ['python', 'ffmpeg', 'gpu-recommended'], notes: 'GPU-optional portrait animation service with queued execution.' },
  { id: 'motion', name: 'Motion', repository: 'https://github.com/motiondivision/motion', category: 'design', mode: 'native-library', enabledByDefault: true, requires: ['node'], notes: 'Use as the single motion/animation library; avoid adding another overlapping UI animation engine.' },
  { id: 'api-mega-list', name: 'API Mega List', repository: 'https://github.com/cporter202/API-mega-list', category: 'api-catalog', mode: 'reference-catalog', enabledByDefault: true, installTarget: 'D:/JARVIS/catalogs/api-mega-list', requires: ['git'], notes: 'Indexed reference catalog; never execute third-party APIs without explicit credentials and policy checks.' },
  { id: 'social-media-scraping-apis', name: 'Social Media Scraping APIs', repository: 'https://github.com/cporter202/social-media-scraping-apis', category: 'api-catalog', mode: 'reference-catalog', enabledByDefault: true, installTarget: 'D:/JARVIS/catalogs/social-media-scraping-apis', requires: ['git'], notes: 'Catalog only. Each provider requires legality, ToS, privacy, and credential review.' },
  { id: 'n8n', name: 'n8n', repository: 'https://github.com/n8n-io/n8n', category: 'automation', mode: 'managed-service', enabledByDefault: false, installTarget: 'D:/JARVIS/services/n8n', localEndpoint: 'http://127.0.0.1:5678', requires: ['docker-or-node', 'git'], notes: 'Workflow runtime. JARVIS triggers approved workflows through a scoped API key.' },
  { id: 'personalive', name: 'Personalive', repository: 'https://github.com/GVCLab/Personalive', category: 'media', mode: 'managed-service', enabledByDefault: false, installTarget: 'D:/JARVIS/services/personalive', requires: ['python', 'gpu-recommended'], notes: 'Optional avatar/media worker; enable only after hardware probe.' },
  { id: 'browser-use', name: 'Browser Use', repository: 'https://github.com/browser-use/browser-use', category: 'browser', mode: 'skill-pack', enabledByDefault: false, installTarget: 'D:/JARVIS/integrations/browser-use', requires: ['python', 'chromium'], conflictsWith: ['playwright'], notes: 'Do not install by default: JARVIS already has a Playwright Browser Operator. Import only unique high-level agent patterns.' },
  { id: 'playwright', name: 'Playwright', repository: 'https://github.com/microsoft/playwright', category: 'browser', mode: 'native-library', enabledByDefault: true, requires: ['node', 'chromium'], conflictsWith: ['browser-use'], notes: 'Existing canonical browser automation layer in JARVIS.' },
  { id: 'codegraph', name: 'CodeGraph', repository: 'https://github.com/colbymchenry/codegraph', category: 'developer-tools', mode: 'managed-service', enabledByDefault: false, installTarget: 'D:/JARVIS/services/codegraph', requires: ['git', 'runtime-review'], notes: 'Expose repository graph/search through a read-only adapter first.' },
  { id: 'dokploy', name: 'Dokploy', repository: 'https://github.com/Dokploy/dokploy', category: 'deployment', mode: 'remote-only', enabledByDefault: false, requires: ['linux-server', 'docker'], notes: 'Remote deployment target, not a Windows-local dependency.' },
  { id: 'penpot', name: 'Penpot', repository: 'https://github.com/penpot/penpot', category: 'design', mode: 'remote-only', enabledByDefault: false, localEndpoint: 'http://127.0.0.1:9001', requires: ['docker', '8gb-ram-recommended'], notes: 'Connect through API/export adapter. Do not merge its frontend into JARVIS.' },
];

export const integrationCategories = [...new Set(JARVIS_INTEGRATIONS.map((item) => item.category))];
