import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Phone, Mail, MessageCircle, HelpCircle, Clock, MapPin } from "lucide-react";

export default function HelpSupportPage() {
  const [, setLocation] = useLocation();

  const faqItems = [
    {
      question: "How do I place an order?",
      answer: "Browse our menu, add items to cart, and proceed to checkout. You can pay online or choose cash on delivery."
    },
    {
      question: "What are the delivery charges?",
      answer: "Delivery is free for orders above ₹100. Below that, we charge a nominal fee of ₹20."
    },
    {
      question: "How long does delivery take?",
      answer: "Most orders are delivered within 15-25 minutes during peak hours and 10-15 minutes during off-peak hours."
    },
    {
      question: "Can I cancel my order?",
      answer: "You can cancel your order within 2 minutes of placing it. After that, please contact our support team."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => setLocation('/home')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Help & Support</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Contact Options */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Get in Touch</h2>
          <div className="grid grid-cols-1 gap-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-medium">Call Us</h3>
                  <p className="text-sm text-muted-foreground">+91 9876543210</p>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-medium">Email Us</h3>
                  <p className="text-sm text-muted-foreground">support@kitcanteen.com</p>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-medium">Live Chat</h3>
                  <p className="text-sm text-muted-foreground">Available 9 AM - 9 PM</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Operating Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Operating Hours</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Monday - Friday</span>
                <span className="font-medium">7:00 AM - 9:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Saturday</span>
                <span className="font-medium">8:00 AM - 8:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Sunday</span>
                <span className="font-medium">8:00 AM - 6:00 PM</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Our Location</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              KIT College Main Campus<br />
              Main Canteen Building<br />
              Ground Floor<br />
              Kalinga Institute of Technology<br />
              Bhubaneswar, Odisha 751024
            </p>
          </CardContent>
        </Card>

        {/* FAQ */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center space-x-2">
            <HelpCircle className="w-5 h-5" />
            <span>Frequently Asked Questions</span>
          </h2>
          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2">{item.question}</h3>
                  <p className="text-sm text-muted-foreground">{item.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}