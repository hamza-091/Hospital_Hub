import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Activity, ShieldCheck, Clock, Users, ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b bg-card">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold">
            H
          </div>
          <span className="font-semibold text-xl tracking-tight">CareSync</span>
        </div>
        <div className="flex gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Register</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-24 px-6 max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6">
            Modern Hospital Management, <br />
            <span className="text-primary">Simplified.</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            A comprehensive, data-rich clinical tool designed for doctors, nurses, and administrators. Tight, information-dense, and built for speed.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="h-12 px-8 text-base" asChild>
              <Link href="/login">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
              <Link href="/register">Create Patient Account</Link>
            </Button>
          </div>
        </section>

        <section className="py-20 bg-secondary/30 px-6 border-t">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Everything you need in one place</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Activity className="h-6 w-6 text-primary" />}
                title="Clinical Focus"
                description="Information-dense views for patient records, prescriptions, and appointment histories."
              />
              <FeatureCard 
                icon={<ShieldCheck className="h-6 w-6 text-primary" />}
                title="Secure Data"
                description="Role-based access control ensures data privacy for patients, doctors, and admins."
              />
              <FeatureCard 
                icon={<Clock className="h-6 w-6 text-primary" />}
                title="Smart Scheduling"
                description="Real-time slot availability, booking management, and automated statuses."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t bg-card text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} CareSync HMS. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 bg-card border rounded-xl shadow-sm">
      <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
