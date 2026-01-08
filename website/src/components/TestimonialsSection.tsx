import { Star, Quote } from 'lucide-react';

export function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Matthew Lim',
      role: 'Student',
      feedback: '"Attendify has made taking attendance so effortless, even for someone who isn\'t tech-savvy. Truly one of the best systems ever"'
    },
    {
      name: 'Farhana',
      role: 'Student',
      feedback: '"Attendify has made my life as a student so much smoother. Honestly, I wish something like this existed sooner."'
    },
    {
      name: 'Angela Tan',
      role: 'Teacher',
      feedback: '"In decades of teaching, I\'ve never seen an attendance system as simple and efficient as Attendify."'
    }
  ];

  return (
    <section className="bg-black py-20 px-6">
      <div className="container mx-auto">
        <h2 className="text-4xl md:text-5xl text-white text-center mb-16">
          Feedback from our users
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <Quote className="w-12 h-12 text-blue-500 mb-4" />
              
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              <h3 className="text-white text-xl font-semibold mb-1">
                {testimonial.name}
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                {testimonial.role}
              </p>
              
              <p className="text-white/90 text-base leading-relaxed">
                {testimonial.feedback}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
