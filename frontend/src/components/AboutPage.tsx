import { Header } from './Header';
import { Footer } from './Footer';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function AboutPage() {
  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <main className="pt-20">
        {/* About Us Section */}
        <section className="py-20 px-6">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <ImageWithFallback 
                  src="https://images.unsplash.com/photo-1758518729685-f88df7890776?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjB0ZWFtJTIwY29sbGFib3JhdGlvbnxlbnwxfHx8fDE3Njc3OTQzNzh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Team collaboration" 
                  className="w-full h-auto object-cover rounded-lg"
                />
              </div>
              
              <div>
                <h2 className="text-4xl md:text-5xl text-white mb-6">
                  About Us
                </h2>
                <h3 className="text-2xl text-white mb-4">Our Mission</h3>
                <p className="text-white/90 text-lg leading-relaxed">
                  At Attendify, our mission is to simplify attendance management in large educational environments. By leveraging cutting-edge AI-powered facial recognition and biometric technology, we aim to provide a seamless, accurate, and secure solution for tracking attendance in classrooms of all sizes, particularly those with over 200 students.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What We Do Section */}
        <section className="py-20 px-6 border-t border-gray-800">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-4xl md:text-5xl text-white text-center mb-8">
              What We Do ?
            </h2>
            <p className="text-white/90 text-lg leading-relaxed text-center">
              We specialise in automating attendance with real-time facial recognition, ensuring that students are marked present as they enter the classroom without any manual intervention. Our system is designed to reduce administrative workload, increase accuracy, and enhance security - all while protecting student data.
            </p>
          </div>
        </section>

        {/* Our Technology Section */}
        <section className="py-20 px-6 border-t border-gray-800">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-4xl md:text-5xl text-white text-center mb-12">
              Our Technology
            </h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-white text-xl font-semibold mb-2">
                  AI-Powered Facial Recognition:
                </h3>
                <p className="text-white/90 text-lg leading-relaxed">
                  Trained with high-resolution student images, ensuring fast and accurate identification in varying conditions.
                </p>
              </div>

              <div>
                <h3 className="text-white text-xl font-semibold mb-2">
                  Biometric Profiling:
                </h3>
                <p className="text-white/90 text-lg leading-relaxed">
                  Secure, encrypted facial templates that ensure student privacy while maintaining accurate records.
                </p>
              </div>

              <div>
                <h3 className="text-white text-xl font-semibold mb-2">
                  Liveness Detection:
                </h3>
                <p className="text-white/90 text-lg leading-relaxed">
                  Advanced anti-spoofing technology to ensure only real students are recognised.
                </p>
              </div>

              <div>
                <h3 className="text-white text-xl font-semibold mb-2">
                  Virtual Tripwire Detection:
                </h3>
                <p className="text-white/90 text-lg leading-relaxed">
                  A smart system that verifies student presence as they cross the entrance, ensuring real-time attendance logging.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How the Face Scanning Process Works */}
        <section className="py-20 px-6 border-t border-gray-800">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-4xl md:text-5xl text-white text-center mb-12">
              How the Face Scanning Process Works
            </h2>
            
            <div className="space-y-6">
              <div>
                <p className="text-white/90 text-lg leading-relaxed">
                  <span className="font-semibold">1. Face Enrollment:</span> User uploads a clear photo during enrollment. This image is converted into a numeric facial embedding using a CNN model. No raw images are stored.
                </p>
              </div>

              <div>
                <p className="text-white/90 text-lg leading-relaxed">
                  <span className="font-semibold">2. Face Detection:</span> When entering the lecture hall, the camera detects faces in real-time through OpenCV.
                </p>
              </div>

              <div>
                <p className="text-white/90 text-lg leading-relaxed">
                  <span className="font-semibold">3. Liveness Detection:</span> The system checks natural facial movement (blink, depth, head direction) to prevent spoofing.
                </p>
              </div>

              <div>
                <p className="text-white/90 text-lg leading-relaxed">
                  <span className="font-semibold">4. Face Matching:</span> The live embedding is compared with encrypted templates in the database.
                </p>
              </div>

              <div>
                <p className="text-white/90 text-lg leading-relaxed">
                  <span className="font-semibold">5. Tripwire Trigger:</span> Attendance is only logged once the student physically crosses the virtual tripwire zone.
                </p>
              </div>

              <div>
                <p className="text-white/90 text-lg leading-relaxed">
                  <span className="font-semibold">6. Real-Time Update:</span> Attendance immediately appears on dashboards for Student, Lecturer, and Admin.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Attendify Section */}
        <section className="py-20 px-6 border-t border-gray-800">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-4xl md:text-5xl text-white text-center mb-12">
              Why Choose Attendify?
            </h2>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-2 h-2 bg-white rounded-full mt-2" />
                <p className="text-white/90 text-lg leading-relaxed">
                  <span className="font-semibold">Efficiency:</span> Real-time attendance logging with no delays.
                </p>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-2 h-2 bg-white rounded-full mt-2" />
                <p className="text-white/90 text-lg leading-relaxed">
                  <span className="font-semibold">Security:</span> Strong data protection with encrypted student profiles and compliance with GDPR.
                </p>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-2 h-2 bg-white rounded-full mt-2" />
                <p className="text-white/90 text-lg leading-relaxed">
                  <span className="font-semibold">Scalability:</span> Designed for large lecture halls, providing seamless attendance tracking for hundreds of students.
                </p>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-2 h-2 bg-white rounded-full mt-2" />
                <p className="text-white/90 text-lg leading-relaxed">
                  <span className="font-semibold">User-Friendly:</span> Easy-to-use interface for students, lecturers, and admins across both desktop and mobile devices.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}