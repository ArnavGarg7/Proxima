
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { BackgroundFX } from '@/components/background/BackgroundFX';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { api } from '@/lib/axios';
import { Card } from '@/components/ui/Card';

export default function Contact() {
  useDocumentTitle('Contact | Proxima');

  const startAuth = (intent: 'login' | 'signup') => {
    window.location.href = `${api.defaults.baseURL}/api/auth/google?intent=${intent}`;
  };
  const handleSignup = () => startAuth('signup');

  return (
    <BackgroundFX id="top" intensity="low" ambient mesh beams particles spotlight grain className="min-h-screen overflow-x-hidden flex flex-col">
      <LandingNav onSignup={handleSignup} />
      
      <main className="flex-1 w-full max-w-[1000px] mx-auto px-6 sm:px-8 pt-36 pb-24">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center gap-6 mb-16">
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-tight text-text-primary">
            Contact Us
          </h1>
          <p className="max-w-2xl font-sans text-lg text-text-secondary leading-relaxed">
            Get in touch with the Proxima team for support, partnerships, or general inquiries.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <Card className="flex flex-col gap-4 p-6 bg-surface/60 hover:border-gold-primary/30 transition-colors">
            <div className="h-10 w-10 rounded-full bg-gold-primary/10 flex items-center justify-center text-gold-primary">
              <span className="material-symbols-outlined text-[20px]">mail</span>
            </div>
            <div>
              <h3 className="font-display text-lg font-medium text-text-primary mb-1">Email</h3>
              <p className="font-sans text-sm text-text-secondary mb-3">For general inquiries and support.</p>
              <a href="mailto:arnavgargdark@gmail.com" className="font-sans text-sm text-gold-primary hover:underline">
                arnavgargdark@gmail.com
              </a>
            </div>
          </Card>

          <Card className="flex flex-col gap-4 p-6 bg-surface/60 hover:border-gold-primary/30 transition-colors">
            <div className="h-10 w-10 rounded-full bg-gold-primary/10 flex items-center justify-center text-gold-primary">
              <span className="material-symbols-outlined text-[20px]">code</span>
            </div>
            <div>
              <h3 className="font-display text-lg font-medium text-text-primary mb-1">GitHub</h3>
              <p className="font-sans text-sm text-text-secondary mb-3">View the project repository.</p>
              <a href="https://github.com/ArnavGarg7" target="_blank" rel="noreferrer" className="font-sans text-sm text-gold-primary hover:underline">
                github.com/ArnavGarg7
              </a>
            </div>
          </Card>

          <Card className="flex flex-col gap-4 p-6 bg-surface/60 hover:border-gold-primary/30 transition-colors">
            <div className="h-10 w-10 rounded-full bg-gold-primary/10 flex items-center justify-center text-gold-primary">
              <span className="material-symbols-outlined text-[20px]">work</span>
            </div>
            <div>
              <h3 className="font-display text-lg font-medium text-text-primary mb-1">LinkedIn</h3>
              <p className="font-sans text-sm text-text-secondary mb-3">Connect professionally.</p>
              <a href="https://www.linkedin.com/in/arnavgarg7115/" target="_blank" rel="noreferrer" className="font-sans text-sm text-gold-primary hover:underline">
                linkedin.com/in/arnavgarg7115
              </a>
            </div>
          </Card>
        </div>

        {/* Future Support */}
        <section className="bg-surface/50 border border-border p-8 rounded-2xl text-center">
          <h2 className="font-display text-2xl font-semibold text-text-primary mb-4">Future Support Hub</h2>
          <p className="font-sans text-base text-text-secondary leading-relaxed max-w-2xl mx-auto">
            As Proxima continues to grow, we will be introducing a dedicated customer support portal, complete with documentation, live chat, and a community forum. Until then, please reach out directly via email or GitHub.
          </p>
        </section>

      </main>

      <LandingFooter />
    </BackgroundFX>
  );
}
