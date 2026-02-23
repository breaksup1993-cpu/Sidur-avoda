# 🏖️ סידור עבודה – משמר אילת

מערכת לניהול סידור עבודה שבועי, בנויה עם Next.js + Supabase + Vercel.

---

## 🚀 הוראות Deploy מלאות

### שלב 1 – Supabase

1. היכנס ל-[supabase.com](https://supabase.com) וצור פרויקט חדש
2. לחץ על **SQL Editor** והרץ את כל ה-SQL מהקובץ `supabase/schema.sql`
3. לחץ על **Project Settings → API** ושמור:
   - `Project URL`
   - `anon public` key
   - `service_role` key (סודי!)

---

### שלב 2 – GitHub

```bash
# שכפל את הפרויקט
git clone https://github.com/YOUR_USERNAME/mishmeret-eilat.git
cd mishmeret-eilat

# העלה לGitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/mishmeret-eilat.git
git push -u origin main
```

---

### שלב 3 – Vercel

1. היכנס ל-[vercel.com](https://vercel.com) → **New Project**
2. חבר את ה-GitHub repo שיצרת
3. הוסף **Environment Variables**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   ```
4. לחץ **Deploy** ✓

---

### שלב 4 – יצירת מנהל ראשון

לאחר ה-deploy, הרץ בSQL Editor של Supabase:

```sql
-- 1. צור יוזר בAuth (עשה זאת דרך Supabase Dashboard → Authentication → Users → Add User)
-- אימייל: manager@mishmeret.co.il
-- סיסמה: xxxxxxxx

-- 2. אחרי היצירה, קבל את ה-UUID ועדכן:
INSERT INTO profiles (id, email, name, role, must_change_password)
VALUES ('UUID_FROM_AUTH', 'manager@mishmeret.co.il', 'מנהל', 'manager', false);
```

---

## 🗃️ מבנה הפרויקט

```
src/
├── app/
│   ├── login/          # עמוד התחברות
│   ├── change-password/ # שינוי סיסמה ראשוני
│   ├── dashboard/      # עמוד ראשי (עובד + מנהל)
│   └── api/
│       └── users/create/ # API ליצירת משתמשים
├── components/
│   ├── ui/             # Topbar, ValidationPanel, StatsBadge
│   └── shifts/         # ShiftPicker
├── lib/
│   ├── shifts.ts       # הגדרות משמרות
│   ├── validation.ts   # לוגיקת ולידציה
│   ├── week.ts         # עזרי תאריכים
│   └── supabase/       # client + server
└── types/              # TypeScript types
```

---

## 📋 חוקי הסידור המוטמעים

| חוק | תיאור |
|-----|-------|
| 1 | חובה לרשום לפחות **2 בקרים** |
| 2 | חובה לרשום לפחות **צהריים 1** |
| 3 | מי שרושם **מינימום בלבד** אינו יכול לרשום לילות |
| 4 | מי שרושם **מינימום בלבד** אינו יכול לרשום **שישי/שבת לילה** (איכויות) |
| 5 | מי שרושם **מינימום בלבד** אינו יכול לרשום **שישי בוקר** (סבב) |

---

## 🛠️ פיתוח מקומי

```bash
# התקן dependencies
npm install

# צור קובץ env
cp .env.local.example .env.local
# ערוך עם הערכים מSupabase

# הפעל dev server
npm run dev
```

---

## 📊 פיצ'רים

- ✅ התחברות / יצירת משתמשים ע"י מנהל
- ✅ הגשת בקשת סידור עם ולידציה בזמן אמת
- ✅ הוספת הערות לכל משמרת
- ✅ אישור / דחייה עם הערת מנהל
- ✅ דדליין הגשה לכל שבוע
- ✅ היסטוריית בקשות לעובד
- ✅ סידור מלא שבועי למנהל
- ✅ סטטיסטיקות עובדים (איזון הוגן)
- ✅ שינוי סיסמה בהתחברות ראשונה
