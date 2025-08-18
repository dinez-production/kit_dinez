import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FileText, Users, CreditCard, AlertTriangle } from "lucide-react";

export default function TermsConditionsPage() {
  const [, setLocation] = useLocation();

  const sections = [
    {
      icon: Users,
      title: "User Accounts",
      content: [
        "You must be a current student, faculty, or staff member of KIT College to use this service",
        "You are responsible for maintaining the confidentiality of your account credentials",
        "You must provide accurate and up-to-date information when creating your account",
        "One account per person - sharing accounts is prohibited",
        "KIT-Canteen reserves the right to suspend or terminate accounts that violate these terms"
      ]
    },
    {
      icon: CreditCard,
      title: "Orders and Payments",
      content: [
        "All orders are subject to availability and canteen operating hours",
        "Payment must be completed before order processing begins",
        "Order modifications or cancellations must be made within 5 minutes of placement",
        "Refunds will be processed within 3-5 business days for eligible cancellations",
        "KIT-Canteen is not responsible for delays due to high demand or unforeseen circumstances"
      ]
    },
    {
      icon: FileText,
      title: "Service Usage",
      content: [
        "The app is for personal, non-commercial use only",
        "You may not use the service to place fraudulent or fake orders",
        "Bulk ordering for events requires prior approval from canteen management",
        "Screenshots or recordings of other users' information is strictly prohibited",
        "Any attempt to manipulate the app or exploit vulnerabilities will result in account termination"
      ]
    },
    {
      icon: AlertTriangle,
      title: "Limitations and Liability",
      content: [
        "KIT-Canteen provides the service 'as is' without warranties of any kind",
        "We are not liable for any damages arising from service interruptions or errors",
        "Food allergies and dietary restrictions are the user's responsibility to communicate",
        "Maximum liability is limited to the amount paid for the specific order in question",
        "Service availability may be affected by technical issues, holidays, or college events"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary px-4 pt-12 pb-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => setLocation('/profile')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white">Terms & Conditions</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Introduction */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">Terms of Service</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Welcome to KIT-Canteen! By using our mobile application and services, you agree to be bound by these Terms and Conditions. 
              Please read them carefully before using our service.
            </p>
            <div className="p-3 bg-accent/50 rounded-lg">
              <p className="text-sm font-medium">Effective Date: January 2024</p>
              <p className="text-sm text-muted-foreground">Last Updated: January 15, 2024</p>
            </div>
          </CardContent>
        </Card>

        {/* Terms Sections */}
        {sections.map((section, index) => (
          <Card key={index} className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <section.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{section.title}</h3>
              </div>
              <ul className="space-y-2">
                {section.content.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}

        {/* Canteen Policies */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Canteen Specific Policies</h3>
            <div className="space-y-4">
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-1">Operating Hours</h4>
                <p className="text-sm text-muted-foreground">
                  Monday to Saturday: 7:00 AM - 8:00 PM<br />
                  Sunday: 8:00 AM - 6:00 PM<br />
                  Closed on public holidays and college breaks
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-1">Order Pickup</h4>
                <p className="text-sm text-muted-foreground">
                  Orders must be collected within 30 minutes of notification. Uncollected orders will be disposed of without refund.
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-1">Food Safety</h4>
                <p className="text-sm text-muted-foreground">
                  All food is prepared following FSSAI guidelines. Report any food safety concerns immediately to canteen staff.
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-1">Special Dietary Requirements</h4>
                <p className="text-sm text-muted-foreground">
                  Please inform us about allergies or dietary restrictions when placing orders. We cannot guarantee complete allergen-free preparation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Intellectual Property */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Intellectual Property</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-3">
              The KIT-Canteen app, including its design, functionality, and content, is owned by KIT College. 
              You may not copy, modify, distribute, or reverse engineer any part of the application.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              All trademarks, logos, and brand names are the property of their respective owners.
            </p>
          </CardContent>
        </Card>

        {/* Modifications */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Modifications to Terms</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-3">
              KIT-Canteen reserves the right to modify these terms at any time. We will notify users of significant changes 
              through the app or email notifications.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Continued use of the service after modifications constitutes acceptance of the updated terms.
            </p>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
            <p className="text-muted-foreground mb-4">
              For questions about these Terms and Conditions, please contact us:
            </p>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Email:</span> support@kit.edu</p>
              <p><span className="font-medium">Phone:</span> +91 80 1234 5678</p>
              <p><span className="font-medium">Office:</span> Administration Building, KIT College</p>
              <p><span className="font-medium">Hours:</span> Monday to Friday, 9:00 AM - 5:00 PM</p>
            </div>
          </CardContent>
        </Card>

        {/* Acceptance */}
        <Card className="shadow-card border-success">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-success mb-2">Acceptance of Terms</h3>
            <p className="text-sm text-muted-foreground">
              By using the KIT-Canteen application, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. 
              If you do not agree with any part of these terms, please discontinue use of the service.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}