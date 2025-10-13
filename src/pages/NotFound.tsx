import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <div className="text-center bounce-in">
        <div className="text-9xl mb-4">🤔</div>
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-2xl text-muted-foreground mb-8">אופס! הדף לא נמצא</p>
        <p className="text-lg text-muted-foreground mb-8">
          נראה שהדף שחיפשתם לא קיים או הועבר למקום אחר
        </p>
        <Button size="lg" onClick={() => navigate('/')}>
          <Home className="ml-2" />
          חזרה לעמוד הבית
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
