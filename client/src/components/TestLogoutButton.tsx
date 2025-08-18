import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function TestLogoutButton() {
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <Button 
      onClick={handleLogout}
      variant="outline"
      size="sm"
      className="fixed top-4 right-4 z-50"
    >
      <LogOut className="w-4 h-4 mr-2" />
      Test Logout
    </Button>
  );
}