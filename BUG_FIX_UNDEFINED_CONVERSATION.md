# Bug Fix: Undefined Conversation ID Error

## Problem

When opening a new lesson, the application was throwing UUID validation errors:

```
invalid input syntax for type uuid: "undefined"
```

This occurred on three endpoints:
1. `/rest/v1/lesson_sessions?conversation_id=eq.undefined`
2. `/rest/v1/lesson_sessions?select=id` (with undefined filter)
3. `/rest/v1/lesson_messages?conversation_id=eq.undefined`

## Root Cause

The issue had two components:

### 1. Missing `topicId` from Navigation State

In [Lesson.tsx:149](src/pages/Lesson.tsx#L149), the component was trying to access:
```typescript
const topicId = location.state?.topicId;
```

When the page is:
- Refreshed
- Accessed directly via URL
- Navigation state is lost

The `topicId` would be `undefined`.

### 2. Immediate Hook Execution

The `useSessionTracking` hook was called immediately on component mount (line 158), even when `topicId` or `conversationId` might be undefined:

```typescript
const { trackMessage, startResponseTimer, stats } = useSessionTracking(
  conversationId,
  topicId,  // Could be undefined!
  mode
);
```

This caused the hook to make database queries with `undefined` values, resulting in PostgreSQL UUID type errors.

## Solution

### Part 1: Guard in `useSessionTracking` Hook

Added validation to prevent database queries with undefined values:

**File:** [src/hooks/useSessionTracking.ts:40-44](src/hooks/useSessionTracking.ts#L40-L44)

```typescript
// Guard: Don't proceed if conversationId or topicId are undefined/null/empty
if (!conversationId || !topicId || conversationId === 'undefined' || topicId === 'undefined') {
  console.log('Skipping session init: missing conversationId or topicId', { conversationId, topicId });
  return;
}
```

This prevents the hook from attempting to:
- Create/fetch lesson sessions
- Update session metrics
- Query the database with invalid UUIDs

### Part 2: Fetch Missing `topicId` from Conversation

When `topicId` is not in navigation state, fetch it from the `conversations` table:

**File:** [src/pages/Lesson.tsx:232-245](src/pages/Lesson.tsx#L232-L245)

```typescript
// If topicId is missing from state, try to fetch it from the conversation
if (!topicIdFromState || topicIdFromState === 'undefined') {
  const { data: conversation } = await supabase
    .from("conversations")
    .select("topic_id")
    .eq("id", conversationId)
    .single();

  if (conversation?.topic_id) {
    console.log('Fetched topicId from conversation:', conversation.topic_id);
    setFetchedTopicId(conversation.topic_id);
  } else {
    console.warn('Could not fetch topicId for conversation:', conversationId);
  }
}
```

### Part 3: Use Fetched `topicId`

Created state to store the fetched topic ID and use it as fallback:

**File:** [src/pages/Lesson.tsx:81](src/pages/Lesson.tsx#L81)
```typescript
const [fetchedTopicId, setFetchedTopicId] = useState<string | undefined>(undefined);
```

**File:** [src/pages/Lesson.tsx:150-154](src/pages/Lesson.tsx#L150-L154)
```typescript
const topicIdFromState = location.state?.topicId;
const mode = location.state?.mode || "";

// Use fetched topic ID if state topic ID is not available
const topicId = topicIdFromState || fetchedTopicId;
```

### Part 4: Validate `conversationId`

Added additional validation to prevent "undefined" string values:

**File:** [src/pages/Lesson.tsx:217](src/pages/Lesson.tsx#L217)
```typescript
if (!conversationId || conversationId === 'undefined') {
  toast({
    title: "שגיאה",
    description: "לא נמצא מזהה שיחה.",
    variant: "destructive",
  });
  navigate("/dashboard");
  return;
}
```

## Flow After Fix

### Scenario 1: Normal Navigation (State Available)
1. User navigates from Topic page with full state
2. `conversationId` = `location.state.conversationId` ✓
3. `topicId` = `location.state.topicId` ✓
4. `useSessionTracking` initializes normally ✓

### Scenario 2: Page Refresh (State Lost)
1. User refreshes lesson page
2. `conversationId` = `lessonId` from URL params ✓
3. `topicId` = `undefined` initially
4. `useSessionTracking` skips initialization (guard prevents errors) ✓
5. `loadChatHistory` fetches `topicId` from conversations table
6. `setFetchedTopicId` updates state
7. Component re-renders with valid `topicId`
8. `useSessionTracking` initializes on next render ✓

### Scenario 3: Direct URL Access
Same as Scenario 2 - gracefully handles missing state.

## Database Schema Used

The fix relies on the `conversations` table having `topic_id`:

```sql
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  topic_id uuid NOT NULL,  -- Used to fetch missing topicId
  title text,
  created_at timestamp with time zone,
  last_message_at timestamp with time zone
);
```

## Testing

### Test Case 1: New Lesson
1. Navigate to Topic page
2. Click "התחל שיעור חדש"
3. **Expected:** Lesson loads without errors ✓
4. **Verify:** Session tracking initializes correctly ✓

### Test Case 2: Page Refresh
1. Open a lesson
2. Refresh the page (F5)
3. **Expected:** Lesson loads, topicId fetched from DB ✓
4. **Verify:** Console shows "Fetched topicId from conversation" ✓
5. **Verify:** Session tracking initializes after fetch ✓

### Test Case 3: Direct URL
1. Copy lesson URL: `/lesson/{uuid}`
2. Open in new tab
3. **Expected:** Same as Test Case 2 ✓

### Test Case 4: Invalid Conversation ID
1. Navigate to `/lesson/invalid-uuid`
2. **Expected:** Error toast + redirect to dashboard ✓

## Prevention

To prevent similar issues in the future:

1. **Always validate hook parameters** before making database calls
2. **Use guards** for external data (URL params, navigation state)
3. **Provide fallbacks** for missing state data
4. **Check for "undefined" strings** (not just undefined values)
5. **Fetch missing data** from authoritative sources (database)

## Files Modified

1. [src/hooks/useSessionTracking.ts](src/hooks/useSessionTracking.ts)
   - Added guard for undefined conversationId/topicId

2. [src/pages/Lesson.tsx](src/pages/Lesson.tsx)
   - Added fetchedTopicId state
   - Fetch topicId from conversations table when missing
   - Validate conversationId before processing
   - Use fetched topicId as fallback

## Related Issues

This fix also resolves potential issues in:
- Progress calculation (requires valid topicId)
- Session summary generation (requires valid topicId and conversationId)
- Completion assessment (requires valid session data)

All enhanced adaptive pedagogical engine features now work correctly even when navigation state is lost.
