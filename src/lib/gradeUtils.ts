const hebrewLetters = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "יא", "יב"];

export const formatGrade = (grade: number): string => {
  if (grade < 1 || grade > 12) return `${grade}`;
  return `$${hebrewLetters[grade - 1]}`;
};

export const formatGradeRange = (startGrade: number, endGrade: number): string => {
  if (startGrade < 1 || endGrade > 12) return "";
  return `כיתות ${hebrewLetters[startGrade - 1]}-${hebrewLetters[endGrade - 1]}`;
};
