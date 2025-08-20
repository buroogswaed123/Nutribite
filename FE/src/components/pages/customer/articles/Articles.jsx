import React, { useState } from "react";
import "./Articles.css";
import QA from "./QA";

function Articles() {
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showQA, setShowQA] = useState(false);
  const articles = [
    {
      id: 1,
      title: "מזון מעובד שיכול לעזור לך לרדת במשקל? כן, זה אפשרי",
      image:
        "https://www.goodmed.co.il/wp-content/uploads/2022/12/%D7%9E%D7%A9%D7%A7%D7%9C-1536x864.jpg",
      preview:
        "הרזיה לא חייבת להיות מסע מייסר של בישולים והגבלות. תאמינו או לא, יש מזונות מעובדים שדווקא תומכים בירידה במשקל...",
      content:
        "זמן שכולם מדברים על מזון טבעי, אורגני ותוצרת בית, תופתעו לגלות שלא כל מזון מעובד הוא בהכרח רע. למעשה, יש לא מעט מוצרים מעובדים שיכולים להשתלב בתפריט יומי מאוזן, לחסוך זמן ומאמץ, ואפילו לתרום לתהליך של ירידה במשקל. הסוד טמון בבחירה נכונה - לדעת לקרוא תוויות, להעדיף מוצרים עם מעט רכיבים פשוטים, ולשלב אותם בחוכמה בתפריט. אז אילו מזונות מעובדים שווים מקום במטבח שלכם/ן, גם כשמנסים לרזות? כל התשובות כאן בכתבה.",
    },
    {
      id: 2,
      title: "האם נמצאה השיטה שתחליף את מחשבון BMI?",
      image:
        "https://www.medicoverhospitals.in/bmi-calculator/bmi-calculator.webp",
      preview:
        "כבר כמה עשורים שמחשבון BMI משמש כאינדיקטור המרכזי להערכת המשקל והסיכונים הבריאותיים של אנשים. כעת, מחשבון חדש בשם BRI נראה כמחליף מוצלח ומדויק יותר. מה זה בדיוק ומה הסיכוי שבקרוב תראו אותו במרפאות? הפרטים בכתבה",
      content:
        "מחשבון BMI הוא מדד המחשב יחס של גובה ומשקל לצורך הערכת אחוזי שומן בגוף. בצורה זו ניתן להעריך אם מישהו סובל מתת משקל, עודף משקל או השמנת יתר, ובמילים אחרות – האם מישהו בעל סיכון מוגבר למחלות הקשורות למשקל הגוף.כבר כמה עשורים שמחשבון BMI בשימוש עולם הרפואה המודרני והוא בעל תפקיד מכריע בהערכת הבריאות הכללית, הרווחה והסיכון למחלות. אלא שעם התקדמות המדע, עולם הרפואה מבין ששיטה זו זונחת משתנים חשובים אחרים הקריטיים להערכת הבריאות והסיכון למחלות הקשורות למשקל הגוף. כעת, מחשבון חדש בשם BRI נמצא מחליף פוטנציאלי לאור העובדה שהוא מנבא טוב יותר את הסיכון למחלות ולתמותה בהשוואה ל-BMI. הפרטים על ההבדל בין שני המחשבונים בכתבה שלפניכם/ן.",
    },
    {
      id: 3,
      title: "דיאטה קטוגנית – כך תעשו את זה נכון",
      image:
        "https://www.clalit.co.il/he/new_article_images/lifestyle/food%20general/GettyImages-898007174/wide.jpg",
      preview:
        "רוצים/ות לעשות דיאטה קטוגנית? לפני שמתחילים לקצץ בפחמימות ולפנטז על ירידה דרמטית במשקל, כדאי לדעת שתזונה קטוגנית עלולה להיות מאוד מסוכנת והיא אינה מתאימה לכולם/ן. הפרטים המלאים בכתבה",
      content:
        "דיאטה קטוגנית, המכונה גם דיאטת קטו, היא תזונה דלת פחמימות ועשירה בשומן אשר שימשה במשך מאות שנים לטיפול במצבים רפואיים מסוימים. במאה ה-19 שימשה הדיאטה הקטוגנית לאזן את מחלת הסוכרת; בשנת 1920 היא הוצגה כטיפול יעיל לאפילפסיה בילדים שבהם הטיפול התרופתי לא היה יעיל; היא נבדקה ונעשה בה שימוש גם במסגרות מעקב בקרב חולי סרטן, סוכרת, תסמונת שחלות פוליציסטיות ומחלת אלצהיימר. החל משנות ה-70 משווקת הדיאטה הקטוגנית כאסטרטגיה רבת השפעה לצורך ירידה במשקל[1].מה חשוב לדעת לפני שמתחילים עם השינוי התזונתי הקיצוני וממה כדאי להיזהר? התשובות לשאלות אלו ולשאלות נוספות, בכתבה שלפניכם/ן.",
    },
  ];

  return (
    <div className="articles">
      <h1>מאמרים</h1>
      <div className="content">
        {selectedArticle ? (
          showQA ? (
            <div className="qa-section">
              <div className="qa-header">
                <button
                  onClick={() => setShowQA(false)}
                  className="back-to-article"
                >
                  חזרה למאמר
                </button>
              </div>
              <QA articleId={selectedArticle.id} />
            </div>
          ) : (
            <div className="article-full">
              <div className="article-header">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="back-button"
                >
                  חזרה לרשימת המאמרים
                </button>
                {/* Removed the QA button as requested */}
                {/* <button onClick={() => setShowQA(true)} className="qa-button">
                  שאלות ותשובות
                </button> */}
              </div>
              <h2>{selectedArticle.title}</h2>
              <div className="article-content">{selectedArticle.content}</div>
            </div>
          )
        ) : (
          <div className="articles-list">
            {articles.map((article) => (
              <div
                key={article.id}
                className="article-preview"
                onClick={() => setSelectedArticle(article)}
              >
                <div className="article-image-container">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="article-image"
                  />
                </div>
                <div className="article-content-preview">
                  <h3>{article.title}</h3>
                  <p>{article.preview}</p>
                  <button className="read-more">קרא עוד</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default Articles;
