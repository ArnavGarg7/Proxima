
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { BackgroundFX } from '@/components/background/BackgroundFX';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { api } from '@/lib/axios';
import { Card } from '@/components/ui/Card';

export default function Security() {
  useDocumentTitle('Security | Proxima');

  const startAuth = (intent: 'login' | 'signup') => {
    window.location.href = `${api.defaults.baseURL}/api/auth/google?intent=${intent}`;
  };
  const handleSignup = () => startAuth('signup');

  return (
    <BackgroundFX id="top" intensity="low" ambient mesh beams particles spotlight grain className="min-h-screen overflow-x-hidden flex flex-col">
      <LandingNav onSignup={handleSignup} />
      
      <main className="flex-1 w-full max-w-[1000px] mx-auto px-6 sm:px-8 pt-36 pb-24">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center gap-6 mb-20">
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-tight text-text-primary">
            Security & Trust
          </h1>
          <p className="max-w-2xl font-sans text-lg text-text-secondary leading-relaxed">
            We are committed to securing your documents and ensuring AI transparency at every level of the Proxima architecture.
          </p>
        </div>

        {/* Security First */}
        <section className="mb-16">
          <h2 className="font-display text-2xl font-semibold text-text-primary mb-4 border-b border-border/50 pb-2">Security-First Philosophy</h2>
          <p className="font-sans text-base text-text-secondary leading-relaxed mb-4">
            Security is not an afterthought at Proxima; it is a core design philosophy. We build our systems assuming zero trust, employing defense-in-depth strategies to protect your sensitive document workflows.
          </p>
        </section>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <Card className="p-6 bg-surface/60">
            <h3 className="font-display text-xl font-medium text-text-primary mb-3">Encryption</h3>
            <p className="font-sans text-base text-text-secondary leading-relaxed">
              We employ secure handling mechanisms for all documents. Data is transmitted securely using industry-standard protocols, and we are continually enhancing our infrastructure to support comprehensive encryption-at-rest across all storage layers.
            </p>
          </Card>
          <Card className="p-6 bg-surface/60">
            <h3 className="font-display text-xl font-medium text-text-primary mb-3">Privacy</h3>
            <p className="font-sans text-base text-text-secondary leading-relaxed">
              Our privacy-first approach means that your data remains yours. We do not use your private documents to train our core foundation models, ensuring that sensitive information never leaks across tenant boundaries.
            </p>
          </Card>
          <Card className="p-6 bg-surface/60 md:col-span-2">
            <h3 className="font-display text-xl font-medium text-text-primary mb-3">Responsible AI Processing</h3>
            <p className="font-sans text-base text-text-secondary leading-relaxed">
              Trust in AI requires transparency. Our extraction and analysis pipelines are designed for explainability, allowing you to trace AI-generated insights directly back to the source text within your documents.
            </p>
          </Card>
        </div>

        {/* Future Roadmap */}
        <section className="bg-surface/50 border border-border p-8 rounded-2xl">
          <h2 className="font-display text-2xl font-semibold text-text-primary mb-4">Our Roadmap</h2>
          <p className="font-sans text-base text-text-secondary leading-relaxed mb-4">
            We are on a journey toward comprehensive enterprise readiness. While we are continuously improving, our future goals include:
          </p>
          <ul className="list-disc pl-5 font-sans text-base text-text-secondary space-y-2">
            <li>Achieving SOC 2 and ISO 27001 compliance</li>
            <li>Expanding auditability for all user and system actions</li>
            <li>Implementing advanced Role-Based Access Control (RBAC)</li>
            <li>Enabling Bring-Your-Own-Key (BYOK) encryption</li>
          </ul>
        </section>

      </main>

      <LandingFooter />
    </BackgroundFX>
  );
}
