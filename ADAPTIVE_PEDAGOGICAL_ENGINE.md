# Adaptive Pedagogical Engine - Technical Documentation

## Overview

Your English learning platform implements a sophisticated Adaptive Pedagogical Engine that monitors user performance across different learning modes and dynamically evaluates mastery. The system operates through multiple layers:

1. **Frontend Session Tracking** ([Lesson.tsx:127](src/pages/Lesson.tsx#L127))
2. **Real-time Progress Monitoring** ([useSessionTracking.ts](src/hooks/useSessionTracking.ts))
3. **AI-Powered Completion Logic** ([ai-teacher-chat-completion](supabase/functions/ai-teacher-chat-completion/index.ts))
4. **Progress Calculation** ([calculate-topic-progress](supabase/functions/calculate-topic-progress/index.ts))

---

## Current Assessment Architecture

### 1. Session Initialization

**Location:** [useSessionTracking.ts:30-76](src/hooks/useSessionTracking.ts#L30-L76)

When a lesson starts, the system:
- Creates or retrieves a `lesson_sessions` record
- Links session to: `user_id`, `topic_id`, `conversation_id`, and `mode`
- Tracks three modes: `learn`, `homework`, `exam_prep`

### 2. Real-Time Message Tracking

**Location:** [useSessionTracking.ts:79-110](src/hooks/useSessionTracking.ts#L79-L110)

Every user interaction is tracked:

```typescript
trackMessage(isQuestion: boolean, isCorrect?: boolean)
```

**Metrics Updated:**
- `total_messages`: Increments with each message
- `questions_answered`: Increments when AI asks a question
- `correct_answers`: Increments when user answers correctly

**XP Detection:** [Lesson.tsx:398-437](src/pages/Lesson.tsx#L398-L437)

The system detects XP awards in AI responses using regex:
```typescript
const xpMatch = assistantMessage.match(/\+(\d+)\s*XP/);
```

When XP is detected:
- Updates user's `current_xp`, `total_points`, and `level`
- Calls `trackMessage(true, true)` to mark as correct answer
- Prevents duplicate XP awards using `xp_detected` flag

---

## Mode-Specific Evaluation Logic

### Mode 1: Test (exam_prep)

**Location:** [ai-teacher-chat-completion/index.ts:86-97](supabase/functions/ai-teacher-chat-completion/index.ts#L86-L97)

**Completion Criteria:**
- **Minimum Questions:** 15 answered
- **Accuracy Threshold:** ≥85%
- **Strictness:** Very High

**Assessment:**
```typescript
const meetsAccuracyThreshold = accuracy >= 0.85
const hasAnsweredEnough = questionsAnswered >= 15
shouldComplete = hasAnsweredEnough && meetsAccuracyThreshold
```

**Pedagogical Approach:**
- Simulates real exam conditions
- Multiple question types: reading comprehension, grammar, writing, completion, translation
- No immediate answers - step-by-step guidance
- Requires topic/unit specification before generating questions

---

### Mode 2: Homework (homework)

**Location:** [ai-teacher-chat-completion/index.ts:99-142](supabase/functions/ai-teacher-chat-completion/index.ts#L99-L142)

**Completion Criteria:**
- **Bot Confidence:** ≥87% accuracy
- **User Demonstration:** ≥2 correct answers without hints
- **Subskill Coverage:** ≥3 different subskills practiced
- **OR Automatic Completion:** 3 consecutive correct on different subskills

**Advanced Metrics:**
```typescript
const correctWithoutHints = correctAnswers - (session.correct_after_hint || 0)
const botConfidenceHigh = accuracy >= 0.87
const threeConsecutiveOnDifferent =
  correctWithoutHints >= 3 &&
  (session.subskills_practiced?.length || 0) >= 3
```

**Pedagogical Approach:**
- Requires homework content (text/image) before proceeding
- Step-by-step guidance without giving final answers
- Analyzes images if provided
- Validates full task resolution before completion

---

### Mode 3: Learning (learn)

**Location:** [ai-teacher-chat-completion/index.ts:144-185](supabase/functions/ai-teacher-chat-completion/index.ts#L144-L185)

**Completion Criteria:**
- **Minimum Questions:** 12-15
- **Accuracy Threshold:** ≥70%
- **Subskill Coverage:** ≥3 subskills
- **Mastery Demonstration:** ≥2 correct answers per subskill

**Three-Phase Teaching Structure:**

**Phase 1 - Teaching:**
- Brief, clear explanation in Hebrew
- 2-3 examples in English with Hebrew translation
- No questions yet

**Phase 2 - Verification:**
- Asks: "האם ההסבר ברור? מוכן/ה לתרגול?"
- Waits for explicit user confirmation

**Phase 3 - Practice:**
- Varied question types
- Immediate positive reinforcement for correct answers
- Hints (not solutions) for incorrect answers

**Completion Logic:**
```typescript
const hasTwoCorrectPerSubskill = correctWithoutHints >= (subskillsCovered * 2)
shouldComplete = hasMinInteractions && hasGoodAccuracy &&
                 hasCoverage && hasTwoCorrectPerSubskill &&
                 (botProposedCompletion || questionsAnswered >= maxQuestions)
```

---

## Progress Calculation System

**Location:** [calculate-topic-progress/index.ts](supabase/functions/calculate-topic-progress/index.ts)

### Mastery Goal System

**Core Formula:**
```typescript
const Q_GOAL = 100; // 100 correct answers = 100% mastery
const UQ_CORRECT_NEW = UQ_CORRECT_OLD + Q_CORRECT;
const P_NEW = Math.min(1.0, UQ_CORRECT_NEW / Q_GOAL);
const P_FINAL = Math.round(P_NEW * 100);
```

### Additive Progress Model

**Previous Issues:** Progress could decrease between sessions
**Current Solution:** [Lines 129-136](supabase/functions/calculate-topic-progress/index.ts#L129-L136)

```typescript
// Accumulates correct answers across all sessions
UQ_CORRECT_NEW = UQ_CORRECT_OLD + Q_CORRECT
// Progress only increases, never decreases
P_FINAL = Math.round((UQ_CORRECT_NEW / 100) * 100)
```

**Database Update:**
```typescript
await supabase.from('user_topics').upsert({
  user_id: user.id,
  topic_id: topicId,
  overall_progress: P_FINAL,
  total_questions_answered: UQ_TOTAL_NEW,
  correct_answers: UQ_CORRECT_NEW,
  last_session_at: new Date().toISOString(),
})
```

---

## Assessment Factors by Mode

### Dynamic Evaluation Rubric

| Factor | Learn | Homework | Test |
|--------|-------|----------|------|
| **Grammatical Accuracy** | Medium weight (70%) | High weight (87%) | Very High (85%) |
| **Question Volume** | 12-15 questions | Adaptive | 15 questions |
| **Hints Penalty** | Tracked but lenient | Strict (excluded from count) | Minimal hints |
| **Response Time** | Not tracked | Not tracked | Not tracked |
| **Hebrew Reliance** | Not tracked | Not tracked | Not tracked |
| **Subskill Coverage** | Required (≥3) | Required (≥3) | Not required |
| **Vocabulary Range** | Implicit in AI evaluation | Implicit in AI evaluation | Implicit in AI evaluation |

---

## Penalty System

### Hints Impact

**Current Implementation:**
- `hints_used`: Increments when AI provides hints
- `correct_after_hint`: Tracks correct answers following hints
- `correctWithoutHints = correctAnswers - correct_after_hint`

**Mode-Specific Penalties:**

1. **Learning Mode:** Hints are expected and encouraged
   - No strict penalty
   - Still counts toward progress

2. **Homework Mode:** Hints reduce mastery score
   - Only `correctWithoutHints` count toward completion
   - Requires ≥2 independent correct answers

3. **Test Mode:** Hints minimal
   - Overall accuracy must be ≥85% regardless

---

## Session Growth Calculation

### Current System

**Session Metrics:**
```typescript
{
  questions_answered: number,
  correct_answers: number,
  hints_used: number,
  correct_after_hint: number,
  subskills_practiced: string[],
  mode: 'learn' | 'homework' | 'exam_prep'
}
```

**Growth Value:**
```typescript
Session_Growth = correct_answers (this session)
Topic_Progress += Session_Growth / 100
```

### Example Calculation

**Starting State:**
- `UQ_CORRECT_OLD = 30` (30% progress)
- `UQ_TOTAL_OLD = 50`

**Session Results:**
- `Q_TOTAL = 10` questions answered
- `Q_CORRECT = 8` correct answers

**New State:**
- `UQ_CORRECT_NEW = 30 + 8 = 38`
- `P_FINAL = (38 / 100) × 100 = 38%`
- **Session Growth = +8%**

---

## System-Readable Summary Output

### Completion Check Response

**Location:** [ai-teacher-chat-completion/index.ts:210-216](supabase/functions/ai-teacher-chat-completion/index.ts#L210-L216)

```typescript
return {
  shouldComplete: boolean,
  reason: string,
  criteriaMet: {
    questionsAnswered?: number,
    accuracy?: string,
    threshold?: string,
    botConfidence?: string,
    correctWithoutHints?: number,
    subskillsCovered?: number,
    userConfirmed?: boolean,
    correctPerSubskill?: string,
    mutualAgreement?: boolean
  }
}
```

### Progress Update Response

**Location:** [calculate-topic-progress/index.ts:162-170](supabase/functions/calculate-topic-progress/index.ts#L162-L170)

```typescript
return {
  status: 'success',
  topic_id: string,
  new_progress_percentage: number,
  progress_display_hebrew: string,
  message_hebrew: string,
  topic_name?: string,
  overall_progress?: number
}
```

---

## AI Teacher Integration

### Prompt Engineering

**Location:** [ai-teacher-chat/index.ts:157-241](supabase/functions/ai-teacher-chat/index.ts#L157-L241)

**Core Rules:**
1. **XP Mention Forbidden:** AI never mentions XP/points/levels
2. **Language:** All communication in Hebrew, English only for examples
3. **Tone:** Patient, professional, not condescending
4. **Image Analysis:** Analyzes uploaded images for context

**Question Type Separation:**

The system enforces strict separation between question formats:
- **Fill-in-the-blank:** No multiple choice options
- **Translation:** No completion hints
- **Multiple Choice:** Always 4 options
- **Error Correction:** No options provided
- **Sentence Creation:** No templates

**Detection in Frontend:** [Lesson.tsx:575-582](src/pages/Lesson.tsx#L575-L582)

```typescript
{cleanContent.includes("___") ? (
  <FillInTheBlankInput content={cleanContent} />
) : (
  <MultipleChoiceButtons
    content={cleanContent}
    onSelect={(choice) => streamChat(choice)}
    disabled={isLoading}
  />
)}
```

---

## Recommendations for Enhancement

### 1. Response Time Tracking

**Add to `lesson_sessions` table:**
```sql
ALTER TABLE lesson_sessions ADD COLUMN avg_response_time_ms INTEGER;
ALTER TABLE lesson_sessions ADD COLUMN response_times JSONB;
```

**Implementation:**
```typescript
// Track timestamp when question is asked
const questionStartTime = Date.now();

// Calculate when answer received
const responseTime = Date.now() - questionStartTime;

// Update session metrics
await supabase.from('lesson_sessions').update({
  response_times: [...existingTimes, responseTime],
  avg_response_time_ms: calculateAverage([...existingTimes, responseTime])
})
```

### 2. Hebrew Reliance Metric

**Track translation requests:**
```typescript
// Detect when user asks for Hebrew translation
const translationRequested = userMessage.match(/תרגום|מה זה אומר|באעברית/);

// Add to session
await supabase.from('lesson_sessions').update({
  hebrew_translation_requests: session.hebrew_translation_requests + 1
})

// Penalty calculation
const hebrewReliancePenalty = (translation_requests / questions_answered) * 10;
```

### 3. Vocabulary Range Tracking

**Extract vocabulary from responses:**
```typescript
interface VocabularyMetrics {
  unique_words_used: number,
  advanced_words_used: string[],
  repeated_words: Record<string, number>,
  vocabulary_level: 'basic' | 'intermediate' | 'advanced'
}

// Analyze user's English responses
function analyzeVocabulary(userResponses: string[]): VocabularyMetrics {
  // Extract unique words
  // Check against word frequency lists
  // Identify advanced vocabulary usage
  // Return comprehensive metrics
}
```

### 4. Enhanced Session Growth Formula

**Consider multiple factors:**
```typescript
interface SessionGrowth {
  base_correct_answers: number,
  hint_penalty: number,
  time_bonus: number,
  vocabulary_bonus: number,
  session_growth_percentage: number
}

function calculateSessionGrowth(session: SessionData): SessionGrowth {
  const baseScore = session.correct_answers;
  const hintPenalty = session.hints_used * 0.5;
  const timeBonus = session.avg_response_time_ms < 10000 ? 2 : 0;
  const vocabBonus = session.unique_words_used > 20 ? 1 : 0;

  return {
    base_correct_answers: baseScore,
    hint_penalty: hintPenalty,
    time_bonus: timeBonus,
    vocabulary_bonus: vocabBonus,
    session_growth_percentage: (baseScore - hintPenalty + timeBonus + vocabBonus) / 100
  };
}
```

### 5. Adaptive Difficulty Adjustment

**Dynamic question difficulty:**
```typescript
interface DifficultyLevel {
  current_level: 1 | 2 | 3 | 4 | 5,
  consecutive_correct: number,
  consecutive_incorrect: number,
  should_increase: boolean,
  should_decrease: boolean
}

function adjustDifficulty(sessionStats: SessionStats): DifficultyLevel {
  // If 3 consecutive correct → increase difficulty
  // If 2 consecutive incorrect → decrease difficulty
  // Return recommended difficulty level for next question
}
```

### 6. Comprehensive Summary Generation

**Enhanced output protocol:**
```typescript
interface SessionSummary {
  session_id: string,
  mode: 'learn' | 'homework' | 'exam_prep',

  // Quantitative Metrics
  questions_answered: number,
  correct_answers: number,
  accuracy_percentage: number,

  // Qualitative Assessment
  grammatical_accuracy: number,
  vocabulary_range: number,
  response_fluency: number,

  // Progress Tracking
  session_growth: number,
  total_topic_progress: number,
  mastery_level: 'beginner' | 'developing' | 'proficient' | 'mastered',

  // Penalties & Bonuses
  hints_used: number,
  hint_penalty: number,
  time_bonus: number,
  hebrew_reliance_penalty: number,

  // Recommendations
  areas_for_improvement: string[],
  strengths: string[],
  next_session_focus: string
}
```

---

## Implementation Priority

### High Priority (Immediate Value)
1. ✅ **Already Implemented:** Mode-specific evaluation
2. ✅ **Already Implemented:** Hint penalty system
3. ✅ **Already Implemented:** Additive progress model
4. 🔄 **Recommended:** Response time tracking
5. 🔄 **Recommended:** Enhanced session summary

### Medium Priority (High Impact)
1. Hebrew reliance metric
2. Vocabulary range tracking
3. Adaptive difficulty adjustment

### Low Priority (Nice to Have)
1. Detailed subskill breakdown
2. Learning style adaptation
3. Predictive mastery estimation

---

## Database Schema Requirements

### Current Schema (Existing)

```sql
CREATE TABLE lesson_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  topic_id UUID REFERENCES curriculum_topics(id),
  conversation_id TEXT,
  mode TEXT, -- 'learn', 'homework', 'exam_prep'

  -- Performance Metrics
  questions_answered INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  hints_used INTEGER DEFAULT 0,
  correct_after_hint INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,

  -- Coverage
  subskills_practiced TEXT[],

  -- Completion
  completed_at TIMESTAMP,
  completion_criteria_met JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Recommended Enhancements

```sql
-- Add new metrics columns
ALTER TABLE lesson_sessions
ADD COLUMN response_times INTEGER[],
ADD COLUMN avg_response_time_ms INTEGER,
ADD COLUMN hebrew_translation_requests INTEGER DEFAULT 0,
ADD COLUMN vocabulary_metrics JSONB,
ADD COLUMN difficulty_progression JSONB,
ADD COLUMN session_growth_breakdown JSONB;

-- Example JSONB structure for session_growth_breakdown:
{
  "base_correct": 8,
  "hint_penalty": -2,
  "time_bonus": 1,
  "vocab_bonus": 1,
  "total_growth": 8
}
```

---

## Testing & Validation

### Test Scenarios

**Scenario 1: Learning Mode Completion**
- User answers 12 questions
- 9 correct (75% accuracy)
- Covers 3 subskills
- 2 correct per subskill
- **Expected:** Session completes successfully

**Scenario 2: Homework Mode High Standards**
- User answers 5 questions
- 5 correct (100% accuracy)
- 2 correct without hints
- Bot confidence 90%
- Bot confirms resolution
- **Expected:** Session completes successfully

**Scenario 3: Test Mode Strictness**
- User answers 15 questions
- 12 correct (80% accuracy)
- **Expected:** Session does NOT complete (needs 85%)

---

## Conclusion

Your Adaptive Pedagogical Engine is already sophisticated with:
- ✅ Mode-specific evaluation logic
- ✅ Dynamic completion criteria
- ✅ Hint penalty system
- ✅ Additive progress tracking
- ✅ AI-powered assessment

**Key Strengths:**
1. Clear separation between learning modes
2. Strict accuracy requirements for mastery
3. Subskill coverage tracking
4. Hint impact consideration
5. Comprehensive database integration

**Next Steps:**
1. Implement response time tracking for cognitive load assessment
2. Add Hebrew reliance metrics to measure independence
3. Enhance vocabulary range analysis
4. Create comprehensive session summary protocol
5. Add adaptive difficulty adjustment

The system provides a solid foundation for accurate mastery evaluation while maintaining the flexibility to enhance with additional metrics as needed.
