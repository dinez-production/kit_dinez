import { useLocation } from "wouter";
import { Home, ShoppingCart, Clock, User, UtensilsCrossed } from "lucide-react";

interface BottomNavigationProps {
  currentPage: "home" | "menu" | "cart" | "orders" | "profile";
}

export default function BottomNavigation({ currentPage }: BottomNavigationProps) {
  const [, setLocation] = useLocation();

  const navigationItems = [
    { id: "home", label: "Home", icon: Home, route: "/home" },
    { id: "menu", label: "Menu", icon: UtensilsCrossed, route: "/menu/all" },
    { id: "cart", label: "Cart", icon: ShoppingCart, route: "/cart" },
    { id: "orders", label: "Orders", icon: Clock, route: "/orders" },
    { id: "profile", label: "Profile", icon: User, route: "/profile" }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-[100]">
      <div className="flex">
        {navigationItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setLocation(item.route)}
              className={`flex-1 flex flex-col items-center py-3 px-2 transition-colors ${
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "fill-current" : ""}`} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
              {isActive && (
                <div className="w-1 h-1 bg-primary rounded-full mt-1"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}