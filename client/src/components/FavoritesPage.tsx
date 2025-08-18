import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Heart, Star, ShoppingCart, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FavoritesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  // Show empty favorites since no favorites system is implemented yet
  const [favorites, setFavorites] = useState([]);

  const removeFavorite = (itemId: number) => {
    setFavorites(prev => prev.filter(item => item.id !== itemId));
    toast({
      title: "Removed from Favorites",
      description: "Item has been removed from your favorites",
    });
  };

  const addToCart = (item: any) => {
    toast({
      title: "Added to Cart",
      description: `${item.name} added to your cart`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => setLocation('/home')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-white" />
            <h1 className="text-xl font-semibold">My Favorites</h1>
          </div>
        </div>
      </div>

      <div className="p-4">
        {favorites.length > 0 ? (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {favorites.length} item{favorites.length !== 1 ? 's' : ''} in your favorites
            </p>
            
            <div className="space-y-3">
              {favorites.map((item) => (
                <Card key={item.id} className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0"></div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold">{item.name}</h3>
                          {item.isVeg && (
                            <div className="w-4 h-4 border-2 border-green-500 flex items-center justify-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{item.category}</p>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{item.rating}</span>
                        </div>
                      </div>
                      
                      <div className="text-right space-y-2">
                        <p className="font-bold text-lg">₹{item.price}</p>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeFavorite(item.id)}
                            className="p-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => addToCart(item)}
                            className="flex items-center space-x-1"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            <span>Add</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-6">
              <CardContent className="p-4 text-center">
                <h3 className="font-semibold mb-2">Quick Order</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add all favorites to cart with one click
                </p>
                <Button 
                  className="w-full"
                  onClick={() => {
                    favorites.forEach(item => addToCart(item));
                    toast({
                      title: "All favorites added!",
                      description: `${favorites.length} items added to your cart`,
                    });
                  }}
                >
                  Add All to Cart
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-16">
            <Heart className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No favorites yet</h2>
            <p className="text-muted-foreground mb-6">
              Start adding items to your favorites by tapping the heart icon on any dish
            </p>
            <Button onClick={() => setLocation('/home')}>
              Browse Menu
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}