// נושאי לימוד אנגלית מבוססי סילבוס משרד החינוך הישראלי

export interface TopicOption {
  title: string;
  icon: string;
  description: string;
}

// כיתות א-ג
const youngBeginner: TopicOption[] = [
  { title: "צבעים (Colors)", icon: "🎨", description: "לימוד צבעים בסיסיים באנגלית" },
  { title: "מספרים (Numbers)", icon: "🔢", description: "ספירה ומספרים 1-20" },
  { title: "חיות (Animals)", icon: "🐶", description: "שמות של חיות מוכרות" },
  { title: "המשפחה (Family)", icon: "👨‍👩‍👧‍👦", description: "חברי המשפחה באנגלית" },
  { title: "גופי (My Body)", icon: "🙋", description: "חלקי הגוף הבסיסיים" },
  { title: "אוכל (Food)", icon: "🍎", description: "מאכלים ומשקאות בסיסיים" },
  { title: "בגדים (Clothes)", icon: "👕", description: "פריטי לבוש בסיסיים" },
  { title: "צעצועים (Toys)", icon: "🧸", description: "צעצועים וחפצים בבית" },
];

// כיתות ד-ו (Elementary/Intermediate)
const middleBeginner: TopicOption[] = [
  { title: "בית הספר (School)", icon: "🏫", description: "כיתה, מורים ומקצועות לימוד" },
  { title: "תחביבים (Hobbies)", icon: "⚽", description: "פעילויות ותחביבים שאני אוהב" },
  { title: "השגרה היומית (Daily Routine)", icon: "⏰", description: "פעולות יומיומיות ושעות" },
  { title: "מזג האוויר (Weather)", icon: "🌤️", description: "תיאור מזג אוויר ועונות השנה" },
  { title: "העיר שלי (My City)", icon: "🏙️", description: "מקומות בעיר והתמצאות" },
  { title: "Present Simple", icon: "📝", description: "זמן הווה פשוט - בניית משפטים" },
  { title: "הבית (Home)", icon: "🏠", description: "חדרים ורהיטים בבית" },
  { title: "חגים ומועדים (Holidays)", icon: "🎉", description: "חגים וחגיגות" },
];

const middleIntermediate: TopicOption[] = [
  { title: "Present Continuous", icon: "🏃", description: "זמן הווה מתמשך" },
  { title: "Past Simple", icon: "📅", description: "זמן עבר פשוט" },
  { title: "סיפורים קצרים (Short Stories)", icon: "📖", description: "קריאה והבנת סיפורים" },
  { title: "כתיבת פסקה (Paragraph Writing)", icon: "✍️", description: "כתיבת פסקה קצרה" },
  { title: "שאלות ותשובות (Q&A)", icon: "❓", description: "בניית שאלות ומענה עליהן" },
  { title: "אוצר מילים מתקדם (Advanced Vocabulary)", icon: "📚", description: "הרחבת אוצר מילים" },
  { title: "תיאור תמונות (Picture Description)", icon: "🖼️", description: "תיאור תמונות ואירועים" },
  { title: "שיחה בסיסית (Basic Conversation)", icon: "💬", description: "ניהול שיחה פשוטה" },
];

// כיתות ז-ט (Junior High)
const juniorBeginner: TopicOption[] = [
  { title: "דקדוק בסיסי (Basic Grammar)", icon: "📖", description: "יסודות הדקדוק באנגלית" },
  { title: "זמנים בסיסיים (Basic Tenses)", icon: "⏳", description: "הווה, עבר ועתיד פשוט" },
  { title: "קריאה והבנה (Reading)", icon: "📰", description: "קריאת טקסטים קצרים" },
  { title: "כתיבת מייל (Email Writing)", icon: "✉️", description: "כתיבת מייל בסיסי" },
  { title: "אוצר מילים (Vocabulary)", icon: "📝", description: "בניית אוצר מילים" },
  { title: "הקשבה (Listening)", icon: "👂", description: "הקשבה והבנה" },
  { title: "תרגול דיבור (Speaking)", icon: "🗣️", description: "תרגול דיבור בסיטואציות" },
  { title: "תרבות אנגלית (English Culture)", icon: "🇬🇧", description: "היכרות עם התרבות" },
];

const juniorIntermediate: TopicOption[] = [
  { title: "זמנים מורכבים (Complex Tenses)", icon: "⌚", description: "Present Perfect, Past Continuous" },
  { title: "קריאת טקסטים (Text Reading)", icon: "📄", description: "קריאת טקסטים ארוכים יותר" },
  { title: "כתיבת חיבור (Essay Writing)", icon: "📃", description: "כתיבת חיבור מובנה" },
  { title: "דיבור חופשי (Free Speaking)", icon: "💭", description: "שיחה חופשית בנושאים שונים" },
  { title: "ביטויים (Idioms & Phrases)", icon: "💡", description: "ביטויים ומשפטי מפתח" },
  { title: "תקשורת יומיומית (Daily Communication)", icon: "📞", description: "תקשורת בחיי היומיום" },
  { title: "סרטים וסדרות (Movies & Series)", icon: "🎬", description: "למידה דרך תקשורת" },
  { title: "מוזיקה ושירים (Music & Songs)", icon: "🎵", description: "למידה דרך מוזיקה" },
];

const juniorAdvanced: TopicOption[] = [
  { title: "דקדוק מתקדם (Advanced Grammar)", icon: "📚", description: "מבנים דקדוקיים מורכבים" },
  { title: "קריאה מתקדמת (Advanced Reading)", icon: "📖", description: "טקסטים מורכבים וספרות" },
  { title: "כתיבה יצירתית (Creative Writing)", icon: "✨", description: "כתיבה יצירתית וחיבורים" },
  { title: "דיון וויכוח (Debate)", icon: "🎯", description: "ניהול דיון והבעת דעה" },
  { title: "הצגת נושא (Presentation)", icon: "🎤", description: "הכנה והצגת נושא" },
  { title: "ניתוח טקסט (Text Analysis)", icon: "🔍", description: "ניתוח וביקורת טקסטים" },
  { title: "אנגלית עסקית (Business English)", icon: "💼", description: "מושגים בסיסיים באנגלית עסקית" },
  { title: "תקשורת מתקדמת (Advanced Communication)", icon: "🌐", description: "תקשורת ברמה גבוהה" },
];

// כיתות י-יב (High School)
const highBeginner: TopicOption[] = [
  { title: "הכנה לבגרות - יסודות (Bagrut Basics)", icon: "📋", description: "יסודות הבגרות באנגלית" },
  { title: "טקסט לא נראה (Unseen)", icon: "📄", description: "תרגול Unseen לבגרות" },
  { title: "כתיבה מובנית (Structured Writing)", icon: "✍️", description: "כתיבת חיבור לבגרות" },
  { title: "דקדוק לבגרות (Grammar for Bagrut)", icon: "📖", description: "דקדוק נדרש לבחינה" },
  { title: "אוצר מילים לבגרות (Bagrut Vocabulary)", icon: "📚", description: "מילים חיוניות לבגרות" },
  { title: "HOTS שאלות (HOTS Questions)", icon: "🤔", description: "שאלות חשיבה גבוהה" },
  { title: "ספרות בגרות (Bagrut Literature)", icon: "📕", description: "יצירות ספרות לבגרות" },
  { title: "אסטרטגיות בחינה (Exam Strategies)", icon: "🎯", description: "טכניקות לבחינה" },
];

const highIntermediate: TopicOption[] = [
  { title: "Unseen מתקדם (Advanced Unseen)", icon: "📰", description: "תרגול טקסטים מורכבים" },
  { title: "חיבור מתקדם (Advanced Essay)", icon: "📝", description: "כתיבת חיבור מורכב" },
  { title: "ניתוח ספרותי (Literary Analysis)", icon: "📖", description: "ניתוח יצירות ספרות" },
  { title: "אנגלית אקדמית (Academic English)", icon: "🎓", description: "אנגלית ברמה אקדמית" },
  { title: "הבנת הנשמע (Listening Comprehension)", icon: "🎧", description: "הבנת הנשמע מתקדמת" },
  { title: "שיחה ברמה גבוהה (Advanced Speaking)", icon: "🗣️", description: "דיבור ברמה גבוהה" },
  { title: "תרגום (Translation)", icon: "🔄", description: "תרגום עברית-אנגלית" },
  { title: "הכנה לפסיכומטרי (Psychometric Prep)", icon: "📊", description: "הכנה לאנגלית פסיכומטרי" },
];

const highAdvanced: TopicOption[] = [
  { title: "ספרות עולמית (World Literature)", icon: "🌍", description: "יצירות ספרות מהעולם" },
  { title: "כתיבה אקדמית (Academic Writing)", icon: "🎓", description: "כתיבה ברמה אקדמית" },
  { title: "ניתוח ביקורתי (Critical Analysis)", icon: "🔍", description: "ניתוח ביקורתי של טקסטים" },
  { title: "דיבייט ודיון (Debate & Discussion)", icon: "💬", description: "דיבייט ברמה גבוהה" },
  { title: "אנגלית מקצועית (Professional English)", icon: "💼", description: "אנגלית למקצועות" },
  { title: "הכנה לבחינות בינ״ל (International Exams)", icon: "🌐", description: "TOEFL, SAT, IELTS" },
  { title: "כתיבה יצירתית (Creative Writing)", icon: "✨", description: "כתיבה יצירתית מתקדמת" },
  { title: "מחקר באנגלית (Research in English)", icon: "🔬", description: "כתיבת מחקר באנגלית" },
];

// מיפוי לפי כיתה - משלב את כל הנושאים לכל כיתה
export const topicsByGrade: { [grade: number]: TopicOption[] } = {
  1: youngBeginner,
  2: youngBeginner,
  3: youngBeginner,
  4: [...middleBeginner, ...middleIntermediate],
  5: [...middleBeginner, ...middleIntermediate],
  6: [...middleBeginner, ...middleIntermediate],
  7: [...juniorBeginner, ...juniorIntermediate, ...juniorAdvanced],
  8: [...juniorBeginner, ...juniorIntermediate, ...juniorAdvanced],
  9: [...juniorBeginner, ...juniorIntermediate, ...juniorAdvanced],
  10: [...highBeginner, ...highIntermediate, ...highAdvanced],
  11: [...highBeginner, ...highIntermediate, ...highAdvanced],
  12: [...highBeginner, ...highIntermediate, ...highAdvanced],
};

export const getTopicsForStudent = (grade: number): TopicOption[] => {
  return topicsByGrade[grade] || [];
};
