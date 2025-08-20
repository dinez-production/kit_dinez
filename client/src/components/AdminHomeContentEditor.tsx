import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  Star,
  Clock,
  Users,
  ChefHat,
  Utensils,
  Coffee,
  Cookie,
  Pizza,
  Flame,
  ThumbsUp,
  Heart
} from "lucide-react";

interface HeroBanner {
  title: string;
  subtitle: string;
  buttonText: string;
  emoji: string;
}

interface QuickStat {
  icon: string;
  label: string;
  sublabel: string;
}

interface Category {
  name: string;
  icon: string;
  color: string;
  route: string;
}

interface TrendingItem {
  id: string;
  name: string;
  price: number;
  rating: number;
  orders: string;
  trend: string;
}

interface Review {
  name: string;
  rating: number;
  comment: string;
  avatar: string;
}

interface CTASection {
  title: string;
  subtitle: string;
  buttonText: string;
}

export default function AdminHomeContentEditor() {
  const { toast } = useToast();

  // Hero Banner State
  const [heroBanner, setHeroBanner] = useState<HeroBanner>({
    title: "Welcome to KIT Canteen!",
    subtitle: "Delicious meals, quick delivery",
    buttonText: "Explore Menu",
    emoji: "🍽️"
  });

  // Quick Stats State
  const [quickStats, setQuickStats] = useState<QuickStat[]>([
    { icon: "Clock", label: "15 min", sublabel: "Avg delivery" },
    { icon: "Users", label: "10K+", sublabel: "Happy customers" },
    { icon: "ChefHat", label: "50+", sublabel: "Menu items" },
    { icon: "Star", label: "4.8", sublabel: "Average rating" }
  ]);

  // Categories State
  const [categories, setCategories] = useState<Category[]>([
    { name: "Meals", icon: "Utensils", color: "bg-orange-500", route: "/menu/meals" },
    { name: "Snacks", icon: "Cookie", color: "bg-yellow-500", route: "/menu/snacks" },
    { name: "Beverages", icon: "Coffee", color: "bg-blue-500", route: "/menu/beverages" },
    { name: "Combos", icon: "Pizza", color: "bg-purple-500", route: "/menu/combos" }
  ]);

  // Trending Items State
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([
    { id: "t1", name: "Butter Chicken", price: 180, rating: 4.8, orders: "500+ orders", trend: "+15%" },
    { id: "t2", name: "Paneer Tikka", price: 150, rating: 4.7, orders: "300+ orders", trend: "+23%" },
    { id: "t3", name: "Chicken Biryani", price: 220, rating: 4.9, orders: "800+ orders", trend: "+8%" }
  ]);

  // Reviews State
  const [reviews, setReviews] = useState<Review[]>([
    { name: "Priya S.", rating: 5, comment: "Amazing food quality! Always fresh and delicious.", avatar: "👩" },
    { name: "Rahul K.", rating: 5, comment: "Fast delivery and great taste. Highly recommended!", avatar: "👨" },
    { name: "Anita M.", rating: 4, comment: "Good variety and reasonable prices.", avatar: "👩‍🦱" }
  ]);

  // Call to Action State
  const [ctaSection, setCTASection] = useState<CTASection>({
    title: "Love What You See?",
    subtitle: "Join thousands of happy customers at KIT Canteen",
    buttonText: "Add to Favorites"
  });

  // Edit states
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const saveChanges = (section: string) => {
    setEditingSection(null);
    toast({
      title: "Changes Saved",
      description: `${section} has been updated successfully.`,
    });
  };

  const addTrendingItem = () => {
    const newItem: TrendingItem = {
      id: `t${Date.now()}`,
      name: "New Item",
      price: 100,
      rating: 4.0,
      orders: "0 orders",
      trend: "+0%"
    };
    setTrendingItems([...trendingItems, newItem]);
  };

  const addReview = () => {
    const newReview: Review = {
      name: "New Customer",
      rating: 5,
      comment: "Great experience!",
      avatar: "👤"
    };
    setReviews([...reviews, newReview]);
  };

  const addCategory = () => {
    const newCategory: Category = {
      name: "New Category",
      icon: "Utensils",
      color: "bg-gray-500",
      route: "/menu/new"
    };
    setCategories([...categories, newCategory]);
  };

  const addQuickStat = () => {
    const newStat: QuickStat = {
      icon: "Star",
      label: "New",
      sublabel: "Stat"
    };
    setQuickStats([...quickStats, newStat]);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Home Page Content Editor</h1>
        <Badge variant="secondary" className="px-3 py-1">Admin Panel</Badge>
      </div>

      <Tabs defaultValue="hero" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="hero">Hero Banner</TabsTrigger>
          <TabsTrigger value="stats">Quick Stats</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="cta">Call to Action</TabsTrigger>
        </TabsList>

        {/* Hero Banner Tab */}
        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Hero Banner Content
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingSection(editingSection === "hero" ? null : "hero")}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  {editingSection === "hero" ? "Cancel" : "Edit"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingSection === "hero" ? (
                <>
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={heroBanner.title}
                      onChange={(e) => setHeroBanner({...heroBanner, title: e.target.value})}
                      placeholder="Hero banner title"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Subtitle</label>
                    <Input
                      value={heroBanner.subtitle}
                      onChange={(e) => setHeroBanner({...heroBanner, subtitle: e.target.value})}
                      placeholder="Hero banner subtitle"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Button Text</label>
                    <Input
                      value={heroBanner.buttonText}
                      onChange={(e) => setHeroBanner({...heroBanner, buttonText: e.target.value})}
                      placeholder="Button text"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Emoji</label>
                    <Input
                      value={heroBanner.emoji}
                      onChange={(e) => setHeroBanner({...heroBanner, emoji: e.target.value})}
                      placeholder="Emoji"
                    />
                  </div>
                  <Button onClick={() => saveChanges("Hero Banner")} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <div className="bg-gradient-to-r from-primary to-primary-light rounded-lg p-6 text-white">
                  <h2 className="text-2xl font-bold mb-2">{heroBanner.title}</h2>
                  <p className="mb-4">{heroBanner.subtitle}</p>
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" className="glass-effect text-white border-white/30">
                      {heroBanner.buttonText}
                    </Button>
                    <span className="text-4xl">{heroBanner.emoji}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Stats Tab */}
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Quick Stats
                <Button variant="outline" size="sm" onClick={addQuickStat}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Stat
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {quickStats.map((stat, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-2">
                      <Input
                        value={stat.icon}
                        onChange={(e) => {
                          const newStats = [...quickStats];
                          newStats[index].icon = e.target.value;
                          setQuickStats(newStats);
                        }}
                        placeholder="Icon name"
                      />
                      <Input
                        value={stat.label}
                        onChange={(e) => {
                          const newStats = [...quickStats];
                          newStats[index].label = e.target.value;
                          setQuickStats(newStats);
                        }}
                        placeholder="Main label"
                      />
                      <Input
                        value={stat.sublabel}
                        onChange={(e) => {
                          const newStats = [...quickStats];
                          newStats[index].sublabel = e.target.value;
                          setQuickStats(newStats);
                        }}
                        placeholder="Sublabel"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setQuickStats(quickStats.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Food Categories
                <Button variant="outline" size="sm" onClick={addCategory}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {categories.map((category, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-2">
                      <Input
                        value={category.name}
                        onChange={(e) => {
                          const newCategories = [...categories];
                          newCategories[index].name = e.target.value;
                          setCategories(newCategories);
                        }}
                        placeholder="Category name"
                      />
                      <Input
                        value={category.icon}
                        onChange={(e) => {
                          const newCategories = [...categories];
                          newCategories[index].icon = e.target.value;
                          setCategories(newCategories);
                        }}
                        placeholder="Icon name"
                      />
                      <Input
                        value={category.color}
                        onChange={(e) => {
                          const newCategories = [...categories];
                          newCategories[index].color = e.target.value;
                          setCategories(newCategories);
                        }}
                        placeholder="Color class"
                      />
                      <Input
                        value={category.route}
                        onChange={(e) => {
                          const newCategories = [...categories];
                          newCategories[index].route = e.target.value;
                          setCategories(newCategories);
                        }}
                        placeholder="Route path"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setCategories(categories.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trending Items Tab */}
        <TabsContent value="trending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Trending Items
                <Button variant="outline" size="sm" onClick={addTrendingItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trendingItems.map((item, index) => (
                  <Card key={item.id} className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        value={item.name}
                        onChange={(e) => {
                          const newItems = [...trendingItems];
                          newItems[index].name = e.target.value;
                          setTrendingItems(newItems);
                        }}
                        placeholder="Item name"
                      />
                      <Input
                        type="number"
                        value={item.price}
                        onChange={(e) => {
                          const newItems = [...trendingItems];
                          newItems[index].price = parseInt(e.target.value);
                          setTrendingItems(newItems);
                        }}
                        placeholder="Price"
                      />
                      <Input
                        type="number"
                        step="0.1"
                        value={item.rating}
                        onChange={(e) => {
                          const newItems = [...trendingItems];
                          newItems[index].rating = parseFloat(e.target.value);
                          setTrendingItems(newItems);
                        }}
                        placeholder="Rating"
                      />
                      <Input
                        value={item.orders}
                        onChange={(e) => {
                          const newItems = [...trendingItems];
                          newItems[index].orders = e.target.value;
                          setTrendingItems(newItems);
                        }}
                        placeholder="Orders count"
                      />
                      <Input
                        value={item.trend}
                        onChange={(e) => {
                          const newItems = [...trendingItems];
                          newItems[index].trend = e.target.value;
                          setTrendingItems(newItems);
                        }}
                        placeholder="Trend %"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setTrendingItems(trendingItems.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Customer Reviews
                <Button variant="outline" size="sm" onClick={addReview}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Review
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reviews.map((review, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        value={review.name}
                        onChange={(e) => {
                          const newReviews = [...reviews];
                          newReviews[index].name = e.target.value;
                          setReviews(newReviews);
                        }}
                        placeholder="Customer name"
                      />
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={review.rating}
                        onChange={(e) => {
                          const newReviews = [...reviews];
                          newReviews[index].rating = parseInt(e.target.value);
                          setReviews(newReviews);
                        }}
                        placeholder="Rating (1-5)"
                      />
                      <Input
                        value={review.avatar}
                        onChange={(e) => {
                          const newReviews = [...reviews];
                          newReviews[index].avatar = e.target.value;
                          setReviews(newReviews);
                        }}
                        placeholder="Avatar emoji"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setReviews(reviews.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <div className="col-span-2">
                        <Textarea
                          value={review.comment}
                          onChange={(e) => {
                            const newReviews = [...reviews];
                            newReviews[index].comment = e.target.value;
                            setReviews(newReviews);
                          }}
                          placeholder="Review comment"
                          rows={3}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Call to Action Tab */}
        <TabsContent value="cta">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Call to Action Section
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingSection(editingSection === "cta" ? null : "cta")}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  {editingSection === "cta" ? "Cancel" : "Edit"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingSection === "cta" ? (
                <>
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={ctaSection.title}
                      onChange={(e) => setCTASection({...ctaSection, title: e.target.value})}
                      placeholder="CTA title"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Subtitle</label>
                    <Input
                      value={ctaSection.subtitle}
                      onChange={(e) => setCTASection({...ctaSection, subtitle: e.target.value})}
                      placeholder="CTA subtitle"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Button Text</label>
                    <Input
                      value={ctaSection.buttonText}
                      onChange={(e) => setCTASection({...ctaSection, buttonText: e.target.value})}
                      placeholder="Button text"
                    />
                  </div>
                  <Button onClick={() => saveChanges("Call to Action")} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <div className="bg-gradient-to-r from-primary to-primary-light rounded-lg p-6 text-white text-center">
                  <Heart className="w-12 h-12 mx-auto mb-3" />
                  <h3 className="text-xl font-bold mb-2">{ctaSection.title}</h3>
                  <p className="text-white/90 mb-4">{ctaSection.subtitle}</p>
                  <Button variant="ghost" className="glass-effect text-white border-white/30">
                    <Heart className="w-5 h-5 mr-2" />
                    {ctaSection.buttonText}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-center pt-6">
        <Button 
          size="lg" 
          variant="default"
          onClick={() => {
            toast({
              title: "All Changes Published",
              description: "Home page content has been updated successfully.",
            });
          }}
        >
          <Save className="w-5 h-5 mr-2" />
          Publish All Changes
        </Button>
      </div>
    </div>
  );
}