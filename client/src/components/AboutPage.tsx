import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Target, Award, Heart, Clock, Utensils } from "lucide-react";

export default function AboutPage() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: Clock,
      title: "Quick Service",
      description: "Fast and efficient food delivery within the campus"
    },
    {
      icon: Utensils,
      title: "Fresh Food",
      description: "All meals are prepared fresh daily with quality ingredients"
    },
    {
      icon: Heart,
      title: "Healthy Options",
      description: "Nutritious and balanced meals for students and staff"
    },
    {
      icon: Award,
      title: "Quality Assured",
      description: "Maintaining highest standards of food safety and hygiene"
    }
  ];

  const stats = [
    { label: "Happy Customers", value: "0" },
    { label: "Daily Orders", value: "0" },
    { label: "Menu Items", value: "0" },
    { label: "Years of Service", value: "Available" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => setLocation('/home')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">About Us</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Hero Section */}
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Utensils className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">KIT Canteen</h2>
            <p className="text-muted-foreground">
              Serving delicious and nutritious meals to the KIT community since 2014
            </p>
          </CardContent>
        </Card>

        {/* Mission */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>Our Mission</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              To provide affordable, nutritious, and delicious meals to students, faculty, and staff 
              at KIT College. We are committed to maintaining the highest standards of food quality, 
              hygiene, and service while fostering a sense of community through shared dining experiences.
            </p>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features */}
        <div>
          <h2 className="text-lg font-semibold mb-3">What Makes Us Special</h2>
          <div className="space-y-3">
            {features.map((feature, index) => (
              <Card key={index}>
                <CardContent className="p-4 flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Team */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Our Team</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Our dedicated team of chefs, kitchen staff, and service personnel work tirelessly 
              to ensure every meal meets our high standards. Led by experienced professionals 
              with over 15 years in the food service industry.
            </p>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground italic">
                "We believe that good food brings people together and fuels great minds. 
                Every meal we serve is prepared with care and passion."
              </p>
              <p className="text-sm font-medium mt-2">- Chef Ramesh Kumar, Head Chef</p>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold mb-2">Get in Touch</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Have suggestions or feedback? We'd love to hear from you!
            </p>
            <Button onClick={() => setLocation('/help-support')}>
              Contact Us
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}