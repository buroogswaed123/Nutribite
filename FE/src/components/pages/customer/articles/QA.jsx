import React, { useState } from 'react';
import './QA.css';

function QA({ articleId }) {
  const initialQAData = [
    {
      articleId: 1,
      questions: [
        {
          id: 1,
          question: 'האם באמת אפשר לרדת במשקל בלי דיאטה?',
          answer: 'כן, אפשר! העיקרון המרכזי הוא ליצור איזון בריא בתזונה ולא להתמקד בהגבלות קיצוניות.'
        },
        {
          id: 2,
          question: 'כמה זמן לוקח לראות תוצאות?',
          answer: 'התהליך שונה מאדם לאדם, אבל בדרך כלל אפשר להתחיל לראות שינויים תוך 4-6 שבועות של התמדה.'
        }
      ]
    }
  ];

  const [qaData, setQaData] = useState(initialQAData);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  const articleQA = qaData.find(item => item.articleId === articleId);

  const handleAddQuestion = () => {
    if (newQuestion.trim() === '' || newAnswer.trim() === '') {
      alert('אנא מלא שאלה ותשובה לפני ההוספה.');
      return;
    }
    const updatedQuestions = [
      ...articleQA.questions,
      {
        id: articleQA.questions.length + 1,
        question: newQuestion,
        answer: newAnswer
      }
    ];
    const updatedQAData = qaData.map(item =>
      item.articleId === articleId ? { ...item, questions: updatedQuestions } : item
    );
    setQaData(updatedQAData);
    setNewQuestion('');
    setNewAnswer('');
  };

  return (
    <div className="qa-page" dir="rtl">
      <div className="qa-content">
        <div className="qa-header">
          <h1>איך לרדת במשקל בלי דיאטה</h1>
        </div>
        <div className="profile-section" style={{ display: 'flex', alignItems: 'center' }}>
          <div className="profile-info" style={{ marginLeft: '20px' }}>
            <h2>היי, אני אוהר !</h2>
            <p>דיאטנית קלינית (תזונאית)</p>
            <p>מטפלת באכילה רגשית ושיפור</p>
            <p>מערכת היחסים מול אוכל ומול הגוף.</p>
            <p>אני עוזרת לאנשים ונשים לפתח</p>
            <p>אכילה מודעת וקשובה לצרכים של</p>
            <p>הגוף, במטרה להשתחרר מדיאטות</p>
            <p>והתעסקות באוכל ומשקל.</p>
          </div>
          <div className="profile-image" style={{ flexShrink: 0, marginRight: '20px', borderRadius: '50%', overflow: 'hidden', width: '120px', height: '120px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
            <img src="https://ynet-pic1.yit.co.il/cdn-cgi/image/f=auto,w=740,q=75/picserver5/crop_images/2021/08/08/Skz2wdTJt/Skz2wdTJt_0_0_2000_1333_0_x-large.jpg" alt="תמונת פרופיל" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
        <div className="qa-list">
          {articleQA?.questions.map((item) => (
            <div key={item.id} className="qa-item">
              <div className="question">
                <span className="q-icon">ש</span>
                <p>{item.question}</p>
              </div>
              <div className="answer">
                <span className="a-icon">ת</span>
                <p>{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="add-question-form">
          <h3>הוסף שאלה חדשה</h3>
          <input
            type="text"
            placeholder="שאלה"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
          />
          <textarea
            placeholder="תשובה"
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
          />
          <button onClick={handleAddQuestion}>הוסף שאלה</button>
        </div>
      </div>
    </div>
  );
}

export default QA;

