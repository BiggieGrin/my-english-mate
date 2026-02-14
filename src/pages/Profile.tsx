import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { User, Mail, GraduationCap, LogOut, Edit, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatGrade } from '@/lib/gradeUtils';
import { useGetUserQuery, useSignOutMutation } from '@/store/api/authApi';
import { useGetProfileQuery, useUpdateProfileMutation } from '@/store/api/profileApi';
import { PageContainer, PageHeader } from '@/components/layout';

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    parent_email: '',
    grade: 0
  });

  // RTK Query hooks
  const { data: user } = useGetUserQuery();
  const userId = user?.id || '';

  const {
    data: profile,
    isLoading: loading,
  } = useGetProfileQuery(userId, {
    skip: !userId,
  });

  const [updateProfile] = useUpdateProfileMutation();
  const [signOut] = useSignOutMutation();

  // Initialize edit form when profile loads
  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name,
        parent_email: profile.parent_email,
        grade: profile.grade
      });
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    try {
      if (!userId) return;

      await updateProfile({
        userId,
        updates: {
          full_name: editForm.full_name,
          parent_email: editForm.parent_email,
          grade: editForm.grade
        }
      }).unwrap();

      setIsEditing(false);
      toast({
        title: "הצלחה",
        description: "הפרופיל עודכן בהצלחה"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את הפרופיל",
        variant: "destructive"
      });
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageContainer narrow>
        <PageHeader
          title="הפרופיל שלי"
          subtitle="ניהול הפרטים האישיים שלך"
          breadcrumbs={[
            { label: "דף הבית", href: "/dashboard" },
            { label: "פרופיל" },
          ]}
          actions={
            !isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                ערוך
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveProfile}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  שמור
                </Button>
              </div>
            )
          }
        />

        <Card className="p-6 card-bordered elevation-1 mb-6">
          <h3 className="text-xl font-semibold mb-6 text-foreground">
            פרטים אישיים
          </h3>

          <div className="space-y-4">
            {isEditing ? (
              <>
                <div>
                  <Label htmlFor="full_name" className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    שם מלא
                  </Label>
                  <Input
                    id="full_name"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="parent_email" className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    אימייל הורה
                  </Label>
                  <Input
                    id="parent_email"
                    type="email"
                    value={editForm.parent_email}
                    onChange={(e) => setEditForm({ ...editForm, parent_email: e.target.value })}
                    className="text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="grade" className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                    <GraduationCap className="w-4 h-4" />
                    כיתה
                  </Label>
                  <Input
                    id="grade"
                    type="number"
                    value={editForm.grade}
                    onChange={(e) => setEditForm({ ...editForm, grade: parseInt(e.target.value) })}
                    className="text-base"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 p-4 bg-accent rounded-lg">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">שם מלא</p>
                    <p className="text-base font-medium text-foreground">{profile.full_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-accent rounded-lg">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">אימייל הורה</p>
                    <p className="text-base font-medium text-foreground">{profile.parent_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-accent rounded-lg">
                  <GraduationCap className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">כיתה</p>
                    <p className="text-base font-medium text-foreground">{formatGrade(profile.grade)}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Logout Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            התנתק
          </Button>
        </div>
      </PageContainer>
    </div>
  );
};

export default Profile;
