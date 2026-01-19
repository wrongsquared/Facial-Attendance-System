import { Footer } from './Footer';
import { Header } from './Header';
import { Camera, User, Users, Eye, Activity, PieChart, UserCircle, FileText } from 'lucide-react';

export function FeaturesPage() {
  const features = [
    {
      icon: Camera,
      title: 'AI-Powered Facial Recognition',
      description: 'Automatically track attendance through real-time facial recognition powered by CNN-based models and OpenCV. Designed for large classrooms, it ensures fast, accurate, and hassle-free verification of every student as they enter.'
    },
    {
      icon: User,
      title: 'Biometric Profiling',
      description: 'Each student\'s facial data is securely converted into encrypted facial templates during enrollment. No raw images are stored, ensuring privacy and compliance with GDPR and UOW data protection policies while maintaining accurate identification.'
    },
    {
      icon: Users,
      title: 'Multi-Face Detection',
      description: 'Detect and verify multiple students simultaneously with HD cameras positioned at lecture entrances. Optimized for speed and precision, the system handles high-traffic entry points efficiently without slowing down attendance processing.'
    },
    {
      icon: Eye,
      title: 'Liveness Detection',
      description: 'Enhance security with AI-based anti-spoofing measures that detect blinks, head movements, and 3D facial depth. This ensures only real human faces are recognised, preventing fraudulent attempts using photos or videos.'
    },
    {
      icon: Activity,
      title: 'Virtual Tripwire Detection',
      description: 'A smart virtual tripwire at the lecture hall entrance automatically triggers facial recognition and therefore checks when students walk in, ensuring attendance is only recorded upon genuine physical entry.'
    },
    {
      icon: PieChart,
      title: 'Progress Tracker',
      description: 'Students can view their real-time attendance percentage through an interactive dashboard. Custom attendance goals help them stay on track with academic requirements while giving lecturers and admins visibility into overall engagement.'
    },
    {
      icon: UserCircle,
      title: 'Role-Based Dashboards',
      description: 'Provides customised dashboards for students, lecturers, and administrators, each tailored to their specific needs. The dashboards feature interactive visuals, data analytics, and responsive layouts, providing a clear, data-driven overview across all roles and creating a seamless experience on both desktop and mobile devices.'
    },
    {
      icon: FileText,
      title: 'Automated Reports',
      description: 'Generates real-time attendance summaries and progress insights for students, lecturers, and administrators. Reports include daily and monthly statistics, participation trends, and class-wide analytics all automatically compiled and easily accessible through the dashboard.'
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-32 px-6">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-5xl md:text-6xl text-white mb-8">
              Our Features
            </h1>
            <p className="text-white/90 text-lg leading-relaxed">
              At Attendify, we offer a comprehensive suite of features designed to streamline attendance management in large educational settings. Our system combines advanced AI, facial recognition, and cutting-edge technologies to deliver a seamless, secure, and efficient experience for students, lecturers, and administrators. Explore the powerful features that make Attendify the ideal solution for modern classrooms:
            </p>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex gap-6">
                    <div className="flex-shrink-0">
                      <Icon className="w-12 h-12 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-white text-2xl mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-white/80 text-base leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}