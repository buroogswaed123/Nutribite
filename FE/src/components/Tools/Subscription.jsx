import React from 'react';
import t from './tools.module.css';

export default function Subscription() {
  return (
    <div className={t.subs_wrap_rtl__nb}>
      <h2 className={t.subs_title__nb}>מסלולי מנוי</h2>
      <div className={t.subs_grid_cards__nb}>
        {/* Weekly Plan */}
        <div className={t.subs_card_green__nb}>
          <h3 className={t.subs_card_title__nb}>חבילה שבועית</h3>
          <p className={t.subs_price__nb}>₪254 לשבוע</p>
          <ul className={t.subs_list__nb}>
            <li>תפריט מותאם אישית לשבוע</li>
            <li>רשימת קניות חכמה</li>
            <li>גישה לצ׳אט תמיכה בסיסי</li>
            <li>שינויים ועדכונים יומיים</li>
          </ul>
          <button className={t.subs_btn_green__nb}>בחרו חבילה</button>
        </div>

        {/* Monthly Plan */}
        <div className={t.subs_card_green__nb}>
          <h3 className={t.subs_card_title__nb}>חבילה חודשית</h3>
          <p className={t.subs_price__nb}>₪1240 לחודש</p>
          <ul className={t.subs_list__nb}>
            <li>תפריט מותאם אישית לחודש מלא</li>
            <li>ליווי תזונתי שבועי</li>
            <li>גישה לצ׳אט תמיכה מורחב</li>
            <li>מתכונים בלעדיים וטיפים</li>
          </ul>
          <button className={t.subs_btn_green__nb}>בחרו חבילה</button>
        </div>
      </div>
    </div>
  );
}
