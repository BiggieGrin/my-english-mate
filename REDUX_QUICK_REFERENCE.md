# Redux Quick Reference Guide

## Using RTK Query Hooks in Components

### Basic Pattern

```typescript
import { useGetProfileQuery } from '@/store/api/profileApi';

function MyComponent() {
  const { data: user } = useGetUserQuery();
  const userId = user?.id || '';

  const {
    data: profile,      // The fetched data
    isLoading,          // True while fetching
    isFetching,         // True during background refetch
    error,              // Error object if failed
    refetch             // Manual refetch function
  } = useGetProfileQuery(userId, {
    skip: !userId,      // Don't fetch if no userId
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error!</div>;
  if (!profile) return null;

  return <div>{profile.full_name}</div>;
}
```

### Using Mutations

```typescript
import { useUpdateProfileMutation } from '@/store/api/profileApi';

function ProfileEditor() {
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  const handleSave = async () => {
    try {
      await updateProfile({
        userId: '123',
        updates: { full_name: 'New Name' }
      }).unwrap();

      toast({ title: 'Success!' });
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  return (
    <button onClick={handleSave} disabled={isLoading}>
      Save
    </button>
  );
}
```

## Available API Hooks

### Auth API
```typescript
import {
  useGetSessionQuery,
  useGetUserQuery,
  useSignInMutation,
  useSignUpMutation,
  useSignOutMutation
} from '@/store/api/authApi';

// Usage
const { data: session } = useGetSessionQuery();
const { data: user } = useGetUserQuery();
const [signOut] = useSignOutMutation();
```

### Profile API
```typescript
import {
  useGetProfileQuery,
  useUpdateProfileMutation
} from '@/store/api/profileApi';

// Usage
const { data: profile } = useGetProfileQuery(userId);
const [updateProfile] = useUpdateProfileMutation();
```

### Topics API
```typescript
import {
  useGetCurriculumTopicsQuery,
  useGetCurriculumTopicByIdQuery,
  useGetUserTopicsQuery,
  useGetUserTopicByTopicIdQuery,
  useEnrollInTopicMutation
} from '@/store/api/topicsApi';

// Usage
const { data: topics } = useGetUserTopicsQuery(userId);
const { data: topic } = useGetCurriculumTopicByIdQuery(topicId);
const [enrollInTopic] = useEnrollInTopicMutation();
```

### Conversations API
```typescript
import {
  useGetConversationsQuery,
  useGetRecentConversationQuery,
  useGetConversationByIdQuery,
  useCreateConversationMutation,
  useUpdateConversationMutation
} from '@/store/api/conversationsApi';

// Usage
const { data: conversations } = useGetConversationsQuery({ userId });
const { data: recent } = useGetRecentConversationQuery(userId);
const [createConversation] = useCreateConversationMutation();
```

### Messages API
```typescript
import {
  useGetMessagesByConversationQuery,
  useGetMessagesByUserQuery,
  useCreateMessageMutation,
  useGetSessionsByTopicQuery,
  useGetActiveSessionQuery
} from '@/store/api/messagesApi';

// Usage
const { data: messages } = useGetMessagesByConversationQuery(conversationId);
const [createMessage] = useCreateMessageMutation();
```

## Using Standard Slices

### Age Group Slice
```typescript
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectAgeGroup,
  selectGradeText,
  setAgeGroup,
  setAgeGroupFromGrade
} from '@/store/slices/ageGroupSlice';

function MyComponent() {
  const dispatch = useAppDispatch();
  const ageGroup = useAppSelector(selectAgeGroup);
  const gradeText = useAppSelector(selectGradeText);

  const handleSetGrade = (grade: number) => {
    dispatch(setAgeGroupFromGrade(grade));
  };

  return <div>{gradeText}</div>;
}
```

### UI Slice
```typescript
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectTopicDialogOpen,
  selectGreeting,
  setTopicDialogOpen,
  setOnboardingModalOpen
} from '@/store/slices/uiSlice';

function MyComponent() {
  const dispatch = useAppDispatch();
  const isDialogOpen = useAppSelector(selectTopicDialogOpen);
  const greeting = useAppSelector(selectGreeting);

  const openDialog = () => {
    dispatch(setTopicDialogOpen(true));
  };

  return <div>{greeting}</div>;
}
```

## Query Options

### Skip Query
```typescript
const { data } = useGetProfileQuery(userId, {
  skip: !userId  // Don't fetch if condition not met
});
```

### Polling
```typescript
const { data } = useGetUserTopicsQuery(userId, {
  pollingInterval: 30000  // Refetch every 30 seconds
});
```

### Manual Refetch
```typescript
const { data, refetch } = useGetProfileQuery(userId);

const handleRefresh = () => {
  refetch();  // Manually trigger refetch
};
```

### Select from Result
```typescript
const { topicCount } = useGetUserTopicsQuery(userId, {
  selectFromResult: ({ data }) => ({
    topicCount: data?.length || 0
  })
});
```

## Cache Invalidation

### Automatic Invalidation
Mutations automatically invalidate related queries:

```typescript
// This mutation invalidates ['Profile', userId]
await updateProfile({ userId, updates });
// Profile query automatically refetches
```

### Manual Invalidation
```typescript
import { useAppDispatch } from '@/store/hooks';
import { profileApi } from '@/store/api/profileApi';

const dispatch = useAppDispatch();

// Invalidate specific tag
dispatch(profileApi.util.invalidateTags(['Profile']));

// Invalidate specific item
dispatch(profileApi.util.invalidateTags([{ type: 'Profile', id: userId }]));
```

### Reset API State
```typescript
import { profileApi } from '@/store/api/profileApi';

// Reset all profile API state
dispatch(profileApi.util.resetApiState());
```

## Common Patterns

### Dependent Queries
```typescript
const { data: user } = useGetUserQuery();
const { data: profile } = useGetProfileQuery(user?.id || '', {
  skip: !user?.id  // Wait for user before fetching profile
});
```

### Conditional Rendering
```typescript
const { data, isLoading, error } = useGetUserTopicsQuery(userId);

if (isLoading) return <Spinner />;
if (error) return <ErrorMessage />;
if (!data || data.length === 0) return <EmptyState />;

return <TopicsList topics={data} />;
```

### Optimistic Updates (Manual)
```typescript
const [updateProfile] = useUpdateProfileMutation();

const handleUpdate = async (updates) => {
  // Update UI immediately
  const patchResult = dispatch(
    profileApi.util.updateQueryData('getProfile', userId, (draft) => {
      Object.assign(draft, updates);
    })
  );

  try {
    await updateProfile({ userId, updates }).unwrap();
  } catch {
    // Revert on error
    patchResult.undo();
  }
};
```

## Debugging

### Check Cache in Redux DevTools
1. Open Redux DevTools
2. Look at state tree: `state.profileApi.queries`
3. See cached data and status

### Monitor API Calls
```typescript
// Add listeners to track API lifecycle
import { profileApi } from '@/store/api/profileApi';

profileApi.endpoints.getProfile.matchFulfilled;
profileApi.endpoints.getProfile.matchPending;
profileApi.endpoints.getProfile.matchRejected;
```

### Inspect Query Status
```typescript
const {
  isUninitialized,  // Query hasn't started yet
  isLoading,        // First fetch in progress
  isFetching,       // Any fetch in progress (including refetch)
  isSuccess,        // Has data
  isError           // Has error
} = useGetProfileQuery(userId);
```

## TypeScript Types

All types are automatically inferred, but you can import them:

```typescript
import type { Profile } from '@/store/api/profileApi';
import type { TopicWithProgress } from '@/store/api/topicsApi';
import type { ConversationWithTopic } from '@/store/api/conversationsApi';
```

## Best Practices

1. **Always handle loading states**: Show loaders while `isLoading`
2. **Skip queries conditionally**: Use `skip` option when params aren't ready
3. **Use selectFromResult**: Derive data to prevent unnecessary re-renders
4. **Prefer cache**: Let RTK Query manage refetching automatically
5. **Handle errors gracefully**: Always check `error` state
6. **Use optimistic updates**: For better UX on mutations
7. **Invalidate wisely**: Let automatic invalidation work, manual only when needed

## Migration Pattern

When converting old components:

```typescript
// OLD
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchData = async () => {
    const { data } = await supabase.from('profiles').select();
    setData(data);
    setLoading(false);
  };
  fetchData();
}, []);

// NEW
const { data, isLoading } = useGetProfileQuery(userId);
```

## Performance Tips

1. **Use `skip`**: Prevent unnecessary API calls
2. **Use `selectFromResult`**: Reduce re-renders
3. **Set `pollingInterval` wisely**: Don't poll too frequently
4. **Use tag invalidation**: Let RTK Query handle cache
5. **Avoid manual refetch**: Trust the cache

---

For more details, see [REDUX_INTEGRATION_SUMMARY.md](REDUX_INTEGRATION_SUMMARY.md)
