import React, { useState } from 'react';
import t from './tools.module.css';

export default function Subscription({ onChoose }) {
  const [confirmState, setConfirmState] = useState({ open: false, plan: null });

  const openConfirm = (plan) => setConfirmState({ open: true, plan });
  const closeConfirm = () => setConfirmState({ open: false, plan: null });
  const confirm = () => {
    if (onChoose && confirmState.plan) onChoose(confirmState.plan);
    closeConfirm();
  };

  const planLabelHe = confirmState.plan === 'weekly' ? 'חבילה שבועית' : confirmState.plan === 'monthly' ? 'חבילה חודשית' : '';

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
          <button className={t.subs_btn_green__nb} onClick={() => openConfirm('weekly')}>בחרו חבילה</button>
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
          <button className={t.subs_btn_green__nb} onClick={() => openConfirm('monthly')}>בחרו חבילה</button>
        </div>
      </div>

      {confirmState.open && (
        <div className={t.subs_modal_backdrop__nb} onClick={closeConfirm}>
          <div className={t.subs_modal__nb} onClick={(e) => e.stopPropagation()}>
            <h3 className={t.subs_card_title__nb} style={{ marginBottom: 8 }}>אישור מנוי</h3>
            <p style={{ margin: 0, color: '#064e3b' }}>האם לאשר בחירת {planLabelHe}?</p>
            <div className={t.subs_modal_actions__nb}>
              <button className={t.subs_btn_green__nb} onClick={confirm}>אישור</button>
              <button className={t.subs_btn_ghost__nb} onClick={closeConfirm}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
