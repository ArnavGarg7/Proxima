
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { BackgroundFX } from '@/components/background/BackgroundFX';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/axios';

export default function About() {
  useDocumentTitle('About | Proxima');

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
            AI-native document intelligence <br />
            <span className="text-gold-primary">for modern teams.</span>
          </h1>
          <p className="max-w-2xl font-sans text-lg text-text-secondary leading-relaxed">
            Proxima is built to eliminate manual document work by providing trustworthy, specialized AI that routes, reads, and scores unstructured files into actionable intelligence.
          </p>
          <div className="mt-4">
            <Button variant="primary" size="lg" onClick={handleSignup}>Start Free</Button>
          </div>
        </div>

        {/* Mission */}
        <section className="mb-16">
          <h2 className="font-display text-2xl font-semibold text-text-primary mb-4 border-b border-border/50 pb-2">Our Mission</h2>
          <p className="font-sans text-base text-text-secondary leading-relaxed mb-4">
            We believe that professionals spend too much time reading repetitive documents, extracting entities, and comparing clauses. Proxima exists to automate these professional workflows with high-trust AI, freeing teams to focus on strategy and decision-making instead of data entry.
          </p>
        </section>

        {/* Why Proxima */}
        <section className="mb-16">
          <h2 className="font-display text-2xl font-semibold text-text-primary mb-4 border-b border-border/50 pb-2">Why Proxima?</h2>
          <ul className="list-disc pl-5 font-sans text-base text-text-secondary space-y-2">
            <li><strong>Specialized AI:</strong> Purpose-built models for legal, clinical, and compliance documents.</li>
            <li><strong>Explainable Workflows:</strong> Every extracted data point can be traced back to its source in the document.</li>
            <li><strong>Modern UX:</strong> A blazing fast, intuitive interface that feels like a consumer app.</li>
            <li><strong>Privacy-First Mindset:</strong> We do not train on your private documents.</li>
          </ul>
        </section>

        {/* Vision */}
        <section className="mb-16">
          <h2 className="font-display text-2xl font-semibold text-text-primary mb-4 border-b border-border/50 pb-2">Vision</h2>
          <p className="font-sans text-base text-text-secondary leading-relaxed">
            Our long-term vision is to become the ultimate AI operating system for document workflows. We are building the foundational intelligence layer that allows any organization to safely process, query, and structure their internal knowledge base at scale.
          </p>
        </section>

        {/* Built By */}
        <section className="mb-16 bg-surface/50 border border-border p-6 rounded-2xl">
          <h2 className="font-display text-xl font-semibold text-text-primary mb-2">Built By</h2>
          <p className="font-sans text-sm text-text-secondary mb-4">
            Proxima is engineered and maintained by Arnav Garg. Focused on bridging the gap between cutting-edge AI and practical, trustworthy enterprise workflows.
          </p>
        </section>

        {/* Final CTA */}
        <div className="flex justify-center mt-12">
          <Button variant="primary" size="lg" onClick={handleSignup} rightIcon={<span className="material-symbols-outlined text-[17px]">arrow_forward</span>}>
            Start Free
          </Button>
        </div>
      </main>

      <LandingFooter />
    </BackgroundFX>
  );
}
