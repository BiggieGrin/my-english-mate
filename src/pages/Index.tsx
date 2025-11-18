import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Sparkles, BookOpen, Trophy, Heart } from "lucide-react";
import heroTeacher from "@/assets/hero-teacher.jpg";
import kidsLearning from "@/assets/kids-learning.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleStart = () => {
    setIsAnimating(true);
    setTimeout(() => {
      navigate("/register");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">המורה לאנגלית שלי</h1>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/auth")}>
              התחברות
            </Button>
            <Button variant="outline" onClick={() => navigate("/parent")}>
              כניסת הורים
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 fade-in-up">
            <h2 className="text-5xl md:text-6xl font-bold leading-tight">
              למדו אנגלית
              <br />
              <span className="text-primary">בקלות ובהנאה!</span>
            </h2>
            <p className="text-xl text-muted-foreground">מורה אנגלית חכם שמדבר עברית ומלמד בדיוק בקצב שלך</p>
            <Button
              size="lg"
              className={`text-xl px-8 py-6 glow ${isAnimating ? "bounce-in" : ""}`}
              onClick={handleStart}
            >
              <Sparkles className="ml-2" />
              בואו נתחיל!
            </Button>
          </div>
          <div className="relative bounce-in">
            <img src={heroTeacher} alt="המורה החכמה לאנגלית" className="rounded-3xl shadow-2xl w-full" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">למה ילדים אוהבים ללמוד פה?</h3>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="p-8 text-center hover:scale-105 transition-transform">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h4 className="text-xl font-bold mb-2">לומדים בעברית</h4>
            <p className="text-muted-foreground">המורה מסביר בעברית, כך שהכל ברור ופשוט</p>
          </Card>

          <Card className="p-8 text-center hover:scale-105 transition-transform">
            <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-secondary" />
            </div>
            <h4 className="text-xl font-bold mb-2">בקצב שלך</h4>
            <p className="text-muted-foreground">המורה מתאים את עצמו בדיוק לרמה ולגיל שלך</p>
          </Card>

          <Card className="p-8 text-center hover:scale-105 transition-transform">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-accent" />
            </div>
            <h4 className="text-xl font-bold mb-2">מרוויחים הישגים</h4>
            <p className="text-muted-foreground">כל תרגיל = נקודות, מדליות ומדבקות מגניבות!</p>
          </Card>
        </div>
      </section>

      {/* Kids Learning Image */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-card rounded-3xl p-8 md:p-12 shadow-xl">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <img src={kidsLearning} alt="ילדים לומדים אנגלית" className="rounded-2xl" />
            <div className="space-y-4">
              <h3 className="text-3xl font-bold">למידה שמשנה הכל</h3>
              <p className="text-lg text-muted-foreground">
                אלפי ילדים בישראל כבר משפרים את האנגלית שלהם איתנו - בצורה שמהנה, בטוחה ומותאמת אישית לכל תלמיד.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li>✓ מותאם לתכנית הלימודים בבתי הספר</li>
                <li>✓ בטוח וידידותי לילדים</li>
                <li>✓ מעקב התקדמות להורים</li>
                <li>✓ זמין 24/7</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h3 className="text-4xl font-bold mb-6">מוכנים להתחיל?</h3>
        <p className="text-xl text-muted-foreground mb-8">ההרשמה לוקחת רק דקה אחת והשיעור הראשון חינם!</p>
        <Button size="lg" className="text-xl px-12 py-6 glow" onClick={handleStart}>
          <Sparkles className="ml-2" />
          להתחיל ללמוד עכשיו
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4">
          <p>© 2025 המורה לאנגלית שלי - כל הזכויות שמורות</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
